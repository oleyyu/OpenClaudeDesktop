const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu, powerSaveBlocker, powerMonitor, Notification, clipboard, nativeImage, Tray, nativeTheme, screen,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const run = promisify(execFile);
const worktrees = require("./worktrees.cjs");
const { CodexClient, stopAllCodexClients, resolveCore, setCoreChoice, setCodexLaunch, codexBinary, deepseekCoreScript, bridgeScript, nodeBinary, coreError } = require("./codex.cjs");
const { createCoreManager } = require("./core-manager.cjs");
const { createExtensionPacks } = require("./extension-packs.cjs");
const { coreName: coreNameOf, coreForEngine, coreById, coreSupports, coreCapabilities, worktreeBranchPrefix } = require("./core-registry.mjs");
// The assistant's name in the copy (i18n setAssistantName): the chosen core's, DeepSeek by default.
const chosenAssistant = () => { const core = coreById(config?.core); return (core && core.available !== false && core.assistant) || "DeepSeek"; };
const { defaultProfile, normalizeSelection, toolProfilesPatch } = require("./prefs/tool-profiles.mjs");
const { respondToApproval } = require("./respond-approval.cjs");
const { createNativeSideChat } = require("./native-side-chat.cjs");
const { createNativeThreadTitles } = require("./native-thread-title.cjs");
const { messageFeedbackParams } = require("./message-feedback.cjs");
const { interruptTurn } = require("./interrupt-turn.cjs");
const { steerTurn } = require("./steer-turn.cjs");
const { createSessionOperations, connectionMatches } = require("./session-operations.cjs");
const { createBtwSessions, supportsBtwChildren } = require("./btw-sessions.cjs");
const { createCustomizeOperations } = require("./customize-operations.cjs");
const { installShutdownHandler } = require("./shutdown.cjs");
const { createLiveWork, backgroundSessions, createQuitGuard } = require("./quit-guard.cjs");
const { createTerminalService } = require("./terminal-service.cjs");
// Sessions with a running turn or workflow (quit-guard.cjs), fed from receive() and emit().
const liveWork = createLiveWork({ getConfig: () => config });
// The running core's own saved-workflow folders (descriptor workflowFolders: Qwen's .qwen/workflows), read and written
// beside .claude/workflows by OpenClaude Desktop's workflow engine, so a script saved by either engine is found by both.
const coreWorkflowFolders = () => { const folders = coreForEngine(client?.serverInfo?.engine).workflowFolders; return Array.isArray(folders) ? [...folders] : []; };
// Sessions whose core goal is working (thread/goal/updated status active), so quitting can pause them first.
const activeGoals = new Set();
function observeGoal(e) {
  const id = e.params?.threadId;
  if (typeof id !== "string" || !id) return;
  if (e.method === "thread/goal/updated") { if (e.params?.goal?.status === "active") activeGoals.add(id); else activeGoals.delete(id); }
  else if (e.method === "thread/goal/cleared") activeGoals.delete(id);
}
// The last context usage each thread reported (thread/tokenUsage/updated) on the live connection. A core replays it only
// when a thread is attached (Codex token_usage_replay.rs), and a reloaded window (a language switch, View › Reload)
// finds its threads still attached here: init hands it over so the context ring isn't blank until the next reply.
const threadUsage = new Map();
function observeUsage(e) {
  if (e.kind === "connection" && !e.connected) { threadUsage.clear(); return; }
  const id = e.params?.threadId;
  if (e.method !== "thread/tokenUsage/updated" || typeof id !== "string" || !id || !e.params?.tokenUsage) return;
  threadUsage.delete(id);
  threadUsage.set(id, e.params.tokenUsage);
  while (threadUsage.size > 500) threadUsage.delete(threadUsage.keys().next().value);
}
// Quitting pauses each working goal on a native core (Codex), as Codex's TUI does before it exits
// (app/event_dispatch.rs RunningTaskExitAction::Exit: thread_goal_set Paused, then turn_interrupt): otherwise the next
// app-server resumes the goal loop on its own when the session is next opened. A bridge core (permission hints) keeps
// its own restart rule (DeepSeek disarms a goal across restarts).
async function pauseActiveGoals() {
  if (!activeGoals.size || !client?.connection || client.connection.closed || client.serverInfo?.capabilities?.permissionHints === true) return;
  const ids = [...activeGoals].filter((id) => config.threadIds.includes(id));
  await Promise.race([
    Promise.allSettled(ids.map((threadId) => client.request("thread/goal/set", { threadId, status: "paused" }, 3000))),
    new Promise((resolve) => setTimeout(resolve, 3500).unref?.()),
  ]);
}
const { listFiles, readFile, scopedPath, openBlockReason, sessionPathGone } = require("./files.cjs"); // R3-files FT-05: sessionPathGone
const sessionFileAccess = require("./session-file-access.cjs");
// B13: the Files viewer's rendered HTML preview frame (file-preview-frame.cjs); the scheme is privileged before ready.
const { SCHEME: FILE_PREVIEW_SCHEME, createFilePreviewFrames } = require("./file-preview-frame.cjs");
const filePreviewFrames = createFilePreviewFrames();
// R4g-mcp MA-3: the MCP App sandbox proxy page (mcp-app-sandbox.cjs); privileged in the same single call.
const { SCHEME: MCP_APP_SANDBOX_SCHEME, createMcpAppSandbox, guardSandboxPermissions } = require("./mcp-app-sandbox.cjs");
const mcpAppSandbox = createMcpAppSandbox();
require("electron").protocol.registerSchemesAsPrivileged([{ scheme: FILE_PREVIEW_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }, { scheme: MCP_APP_SANDBOX_SCHEME, privileges: { standard: true, secure: true } }]);
const { createFilesWatch } = require("./files-watch.cjs");
const { readEditableFile, writeFile: writeEditedFile } = require("./file-editor.cjs");
const {createImageOperations}=require('./image-files.cjs');
const imageOperations=createImageOperations({getRoot:workspaceQueryRoot,clipboard,nativeImage,showSaveDialog:options=>dialog.showSaveDialog(win,options)});
const { createFileNameSearch } = require("./file-name-search.cjs");
const fileSearch = createFileNameSearch();
// Files pane tree: the root and expanded folders a pane shows (cccc2cf0a mv watchSessionDirectories).
const filesWatch = createFilesWatch();
// Main-owned folder choices survive home/session navigation for this process.
// A renderer may select one of these values, never introduce a new root.
const approvedWorkspaceRoots = new Set();
// R4g-routines RT3 (r4-code-routines.md WI-3): `prepare-worktree` is worktree-prepare.mjs with main's own dependencies,
// shared by the IPC case and the Code routine runner.
async function prepareWorktreeInMain(p) {
  const { prepareWorktree } = await import("./worktree-prepare.mjs");
  return prepareWorktree(p, { run, config, save, emit, approvedWorkspaceRoots, worktrees,
    // Named after the running core ("deepseek/…", "kimi/…"), never a hard-coded agent the user doesn't use.
    prefix: () => worktreeBranchPrefix(client?.serverInfo ?? config.core ?? "deepseek") });
}
// Working directories observed from the Codex thread list. Repository queries
// are scoped to these, the chosen folder, approved roots and session metadata.
const observedThreadCwds = new Set();
// The Recent folders list's own rows (recent-folders.cjs: worktree origins and detected projects), which a Recent
// pick may make the session folder (main 'folder' with a path).
const recentFolderPaths = new Set();
let detectedProjects = null;
function workspaceQueryRoot(cwd) {
  const requested = typeof cwd === "string" && cwd ? cwd : config.cwd;
  const known = [config.cwd, ...approvedWorkspaceRoots, ...observedThreadCwds,
    ...Object.values(config.threadMetadata || {}).map(meta => meta?.cwd)];
  if (!known.includes(requested)) throw new Error("Unknown workspace directory.");
  return requested;
}
// A worktree session compares against the branch it was created from; every
// other local session uses the inferred default (official baseIsResolvedDefault).
function sessionBaseBranch(sessionId, cwd) {
  const fromSession = sessionId && config.sessionMetadata?.[sessionId]?.baseBranch;
  if (typeof fromSession === "string" && fromSession) return fromSession;
  const fromWorktree = config.worktreeBases?.[cwd];
  return typeof fromWorktree === "string" && fromWorktree ? fromWorktree : undefined;
}
// One `gh` lookup cache per app run. A Finder/Dock launch lacks the login shell's PATH (Homebrew's gh), its proxy
// and any GH_TOKEN, so the lookup runs with those (proxy-env.cjs, the same single login-shell read the cores use).
let pullRequestLookupInstance = null;
function pullRequestLookup() {
  if (pullRequestLookupInstance) return pullRequestLookupInstance;
  const { createPullRequestLookup } = require("./git-pull-request.cjs");
  const { loginShellVariables, loginShellProxy, proxyEnv } = require("./proxy-env.cjs");
  pullRequestLookupInstance = createPullRequestLookup({ env: async () => {
    const shell = process.env.CODEX_BINARY ? {} : await loginShellVariables(["PATH", "GH_TOKEN", "GITHUB_TOKEN", "GH_HOST", "GH_CONFIG_DIR"]).catch(() => ({}));
    const proxy = process.env.CODEX_BINARY ? {} : await loginShellProxy().catch(() => ({}));
    const env = { ...process.env, ...proxyEnv(process.env, proxy) };
    for (const key of ["GH_TOKEN", "GITHUB_TOKEN", "GH_HOST", "GH_CONFIG_DIR"]) if (shell[key] && !env[key]) env[key] = shell[key];
    env.PATH = [shell.PATH, "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH].filter(Boolean).join(":");
    return env;
  } });
  return pullRequestLookupInstance;
}
// Import GitHub issue (github-issues.cjs): the same gh env as the pull request lookup.
let githubIssuesInstance = null;
function githubIssues() {
  if (githubIssuesInstance) return githubIssuesInstance;
  const { createGithubIssues } = require("./github-issues.cjs");
  const { loginShellVariables, loginShellProxy, proxyEnv } = require("./proxy-env.cjs");
  githubIssuesInstance = createGithubIssues({
    identity: (cwd) => require("./git-status.cjs").repoIdentity(cwd, { home: os.homedir() }),
    env: async () => {
      const shell = process.env.CODEX_BINARY ? {} : await loginShellVariables(["PATH", "GH_TOKEN", "GITHUB_TOKEN", "GH_HOST", "GH_CONFIG_DIR"]).catch(() => ({}));
      const proxy = process.env.CODEX_BINARY ? {} : await loginShellProxy().catch(() => ({}));
      const env = { ...process.env, ...proxyEnv(process.env, proxy) };
      for (const key of ["GH_TOKEN", "GITHUB_TOKEN", "GH_HOST", "GH_CONFIG_DIR"]) if (shell[key] && !env[key]) env[key] = shell[key];
      env.PATH = [shell.PATH, "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH].filter(Boolean).join(":");
      return env;
    },
  });
  return githubIssuesInstance;
}
const { recordActivity, readableLedger, ledgerStats, statsShape, statsCoreKey, keptCodeStats } = require("./activity.cjs");
const { workspaceGitStatus, workspaceGitDiff, workspaceGitComparison, workspaceGitCommits, workspaceGitBranches, workspaceGitImage, workspaceGitFilePatch } = require("./git-status.cjs");
const { porcelainEntries, wouldBranchSwitchConflict } = require("./branch-switch.cjs");
app.setName("OpenClaude Desktop");
if (process.env.CODE_DESKTOP_DATA)
  app.setPath("userData", process.env.CODE_DESKTOP_DATA);
// Bridge cores read Settings › Models custom providers from here (codex.cjs resolveCore).
process.env.CODE_DESKTOP_DATA_DIR = app.getPath("userData");
// The main window focused last (windowRegistry has them all): dialogs, the menu bar, the tray and notifications act on it.
let win;
// Popped-out side panes (2.2553.1 openPopout type "epitaxy-side-pane"): one
// BrowserWindow per session+pane, same preload/sandbox, no approval routing.
const popouts = new Map();
// Confirm unsaved local edits before stopping processes or destroying a window.
const dirtyFileWindows = new Map(), autoSaveWindows = new Set(), pendingFileFlushes = new Map();
let fileFlushSequence = 0;
ipcMain.on('desktop:file-autosave-flushed', (event, token) => {
  const pending = pendingFileFlushes.get(token);
  if (pending?.sender === event.sender.id) pending.finish();
});
function flushFileAutosaves() {
  return Promise.all(BrowserWindow.getAllWindows().filter(window => !window.isDestroyed() && autoSaveWindows.has(window.webContents.id)).map(window => new Promise(resolve => {
    const token = ++fileFlushSequence, sender = window.webContents.id;
    const finish = () => { clearTimeout(timer); pendingFileFlushes.delete(token); resolve(); };
    // An unresponsive renderer falls back to the existing explicit discard guard.
    const timer = setTimeout(finish, 10000);
    pendingFileFlushes.set(token, { sender, finish });
    try { window.webContents.send('desktop:file-autosave-flush', token); } catch { finish(); }
  })));
}
const fileAutosaveQuitGate = require('./file-autosave-quit.cjs').createFileAutosaveQuitGate({
  needsFlush: () => autoSaveWindows.size > 0, flush: flushFileAutosaves, quit: () => app.quit(),
});
ipcMain.on("desktop:file-edit-dirty", (event, paths) => {
  const automatic = !Array.isArray(paths) && paths?.autoSave === true;
  if (!Array.isArray(paths)) paths = paths?.paths;
  const names = Array.isArray(paths) ? paths.filter(p => typeof p === "string").slice(0, 100) : [];
  if (names.length) dirtyFileWindows.set(event.sender.id, names); else dirtyFileWindows.delete(event.sender.id);
  if (names.length && automatic) autoSaveWindows.add(event.sender.id); else autoSaveWindows.delete(event.sender.id);
  event.returnValue = null;
});
function confirmFileEdits(window) {
  const t = (source, values) => i18n ? i18n.t(source, values) : source;
  const names = dirtyFileWindows.get(window.webContents.id);
  if (!names?.length) return true;
  return dialog.showMessageBoxSync(window, { type: "warning", message: t("Discard unsaved changes?"),
    detail: t("Your edits to {name} have not been saved. Leaving this session discards them.", { name: names.map(p => path.basename(p)).join(", ") }),
    buttons: [t("Keep editing"), t("Discard")], defaultId: 0, cancelId: 0, noLink: true }) === 1;
}
// Settings › Storage › App cache details › Clear cache and restart… (2.31226.0 index.chunk-CiiI592G.js Pfa/Mvi): a native
// confirm, then the default session's caches go and the app relaunches (one at a time, N8). Sign-ins, sessions and
// tasks stay. The relaunch goes through the normal quit, so the shutdown handler stops the core first.
let clearingCache = null;
async function clearCacheAndRestart(window) {
  if (clearingCache) return clearingCache;
  clearingCache = (async () => {
    const t = (source, values) => i18n ? i18n.t(source, values) : source;
    const options = { type: "question", message: t("Clear cached web content and restart OpenClaude Desktop?"),
      detail: t("You stay signed in. Open conversations and tasks are kept; the app closes and reopens."),
      buttons: [t("Cancel"), t("Clear and restart")], defaultId: 0, cancelId: 0, noLink: true };
    const { response } = window && !window.isDestroyed() ? await dialog.showMessageBox(window, options) : await dialog.showMessageBox(options);
    if (response !== 1) return false;
    try {
      const { session } = require("electron"), web = session.defaultSession;
      await web.clearCache();
      await web.clearCodeCaches({});
      await web.clearStorageData({ storages: ["cachestorage", "shadercache", "serviceworkers"] });
      await web.clearHostResolverCache();
      await web.clearAuthCache();
    } catch (error) {
      dialog.showErrorBox(t("Error clearing cache"), error instanceof Error ? error.message : String(error));
      return false;
    }
    app.relaunch();
    app.quit();
    return true;
  })().finally(() => { clearingCache = null; });
  return clearingCache;
}
function installFileEditWindowGuard(window) {
  window.webContents.on("will-prevent-unload", event => { if (quitting || confirmFileEdits(window)) event.preventDefault(); });
  const id = window.webContents.id;
  window.once("closed", () => { dirtyFileWindows.delete(id); autoSaveWindows.delete(id); for (const pending of pendingFileFlushes.values()) if (pending.sender === id) pending.finish(); });
}

const POPOUT_ACTIONS = new Set(["init", "files", "file", "file:document-bytes", "image:copy", "file:edit-read", "file:save", "file:preview-frame", "file:preview-frame-release", "file:gone", "files:search", "files:content-search", "files:search:cancel", "files:watch", "workspace-git-status", "workspace-git-diff", "workspace-git-file-patch", "workspace-git-image", "workspace-git-commits", "workspace-git-branches", "popout-dock", "popout-always-on-top", "popout-add-to-prompt", "popout-state", "home-shape", "mcp-app:servers", "mcp-app:read-resource", "mcp-app:list-resources", "mcp-app:call-tool", "mcp-app:sandbox-origin"]);
// R4i-mcp MC1: the five mcp-app:* actions above are mcp-apps-host.cjs WIDGET_ACTIONS: a pane window (the side chat, a
// subagent view) draws MCP App widgets, which read and call through them (official widget IPC is open to every window).
// R4i-transcript TR3 (layout-08): "session" is the /btw side pane (2.42304.0 c03935b01 pa lists it among the tiles that
// pop out; cccc2cf0a XO). It is an App pane window too: the child's live turns, composer and queue run there.
const POPOUT_KINDS = new Set(["files", "changes", "plan", "tasks", "terminal", "side-chat", "session"]);
// B27 (c03935b01 $a: diff, file, terminal, plan, tasks… pop out; cd377abb5 _i: the side chat): the Tasks, Terminal and
// Side chat panes need the session's live state, so their window runs the session's App with that one pane
// (main.jsx PANE_WINDOW) and is registered in windowRegistry as a pane window; Files, Changes and Plan keep the light
// PopoutApp. The Preview pane stays in the main window: its popout is behind a flag in the reference (c03935b01 eo).
const APP_POPOUT_KINDS = new Set(["tasks", "terminal", "side-chat", "session"]);
// cd377abb5 _i: the side chat window is smaller (280x160 minimum) and opens over the panel it replaced.
const SIDE_CHAT_MIN_SIZE = { width: 280, height: 160 };
const POPOUT_DEFAULT_SIZE = { width: 900, height: 700 }, POPOUT_MIN_SIZE = { width: 400, height: 320 };
// The pane popouts and the session popouts (B27, popout-restore.cjs SESSION_PANE) saved at a quit. A side chat window is
// transient (cd377abb5 wr saves code-session and side-pane popouts only).
const RESTORABLE_POPOUT_KINDS = new Set([...[...POPOUT_KINDS].filter((kind) => kind !== "side-chat"), "session"]);
let config;
let localRoutines;
let routineApprovals; // R4g-routines RT6: a Code task's Always allowed rules (routine-approvals.mjs)
let codeCleanup;
let coworkSessions;
// Cowork is still in development: builds keep it off (the renderer shows a placeholder and no Cowork session starts);
// CODE_DESKTOP_COWORK=1 turns it on for local work.
const COWORK_ENABLED = process.env.CODE_DESKTOP_COWORK === "1";
let configPath;
let client;
let initial;
let connecting;
let desktopSettings;
let workflowService;
const {createAccountOperations,perTokenAccount,perTokenRefusal}=require('./account-operations.cjs');
const accountOperations=createAccountOperations({getClient:()=>client,openExternal:url=>shell.openExternal(url),
  onState:auth=>emit({kind:'account-auth',auth}),onAccount:account=>{if(initial)initial={...initial,account};emit({kind:'account-snapshot',account});}});
const {createWorkflowService,workflowCoreCommand}=require("./workflow-service.cjs");
const {createWorkflowToolService}=require("./workflow-tool-service.cjs");
const {resolveWorkflowSettings,workflowRunnerEnv,workflowEngineFor}=require("./prefs/workflow-settings.mjs");
let workflowToolService;
// Managed settings (an administrator's hard limits): {disableWorkflows: true} turns Dynamic workflows off for good
// (Claude Code's managed disableWorkflows). CODE_DESKTOP_MANAGED_SETTINGS names another file (tests).
const MANAGED_SETTINGS = process.env.CODE_DESKTOP_MANAGED_SETTINGS || (process.platform === "darwin" ? "/Library/Application Support/OpenClaude Desktop/managed-settings.json" : process.platform === "win32" ? path.join(process.env.ProgramData || "C:\\ProgramData", "OpenClaude Desktop", "managed-settings.json") : "/etc/code-desktop/managed-settings.json");
let managedCache = { at: 0, value: {} };
function managedSettings() {
  if (Date.now() - managedCache.at < 5000) return managedCache.value;
  let value = {};
  try { const read = JSON.parse(fs.readFileSync(MANAGED_SETTINGS, "utf8")); if (read && typeof read === "object" && !Array.isArray(read)) value = read; } catch { /* none */ }
  managedCache = { at: Date.now(), value };
  return value;
}
/** Settings › Code › Dynamic workflows in effect: the saved values, the environment (wins) and managed settings. */
// The Workflow agents' model is saved per core (a model id belongs to one core's catalog): the running core's entry,
// checked against the catalog it listed at connect.
const workflowSettings = () => {
  let coreId;
  try { coreId = client?.serverInfo ? coreForEngine(client.serverInfo.engine).id : undefined; } catch { coreId = undefined; }
  const models = coreId && initial?.core?.id === coreId && Array.isArray(initial.models) ? initial.models.map((model) => model?.model ?? model?.id).filter((id) => typeof id === "string") : null;
  return resolveWorkflowSettings({ config: config || {}, env: process.env, managed: managedSettings(), parallelism: os.availableParallelism?.() ?? os.cpus().length, coreId, models });
};
/**
 * How OpenClaude Desktop's runner gets an agent's structured result from the running core: undefined — Codex's StructuredOutput
 * dynamic tool (a native core); "outputSchema" — turn/start outputSchema only (the DeepSeek Harness, OpenCode/MiMo: no
 * dynamic tools); false — no structured output (ZCode, the ACP agents). Both of the latter ask for JSON in the prompt.
 */
function runnerStructuredOutput(owner = client) {
  const info = owner?.serverInfo;
  if (coreCapabilities(info).structuredOutput === false) return false;
  return coreForEngine(info?.engine).kind === "native" ? undefined : "outputSchema";
}
/** The workflow variables set in the app's environment, for Settings (the renderer resolves the same way). */
const WORKFLOW_ENV_KEYS = ["CLAUDE_CODE_DISABLE_WORKFLOWS", "CLAUDE_CODE_WORKFLOWS", "CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS", "MAX_STRUCTURED_OUTPUT_RETRIES", "CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS",
  "CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE", "CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS", "CLAUDE_CODE_WORKFLOW_SIZE_WARNING_TOKENS", "CLAUDE_CODE_SUBAGENT_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL_FORCE", "CLAUDE_WORKFLOW_NAME_ONLY"];
const workflowEnvFacts = () => Object.fromEntries(WORKFLOW_ENV_KEYS.filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
/** Which engine runs the running core's dynamic workflows: "native" (its own, capabilities.modelWorkflows) or "codeDesktop". */
function currentWorkflowEngine(owner = client) {
  const info = owner?.serverInfo;
  return workflowEngineFor(workflowSettings().engines, coreForEngine(info?.engine).id, coreSupports(info, "modelWorkflows"));
}
const {createBackgroundTasks}=require("./background-tasks.cjs");
const backgroundOperations=createBackgroundTasks({getClient:()=>client,getConfig:()=>config});
const {desktopPatch,createDesktopSettings,directoryUsage} = require("./desktop-settings.cjs");
const { createCodeCleanup } = require("./code-cleanup.cjs");
const {createMenuBar,showWindow} = require("./menu-bar.cjs");
// R4f-popout F3 (layout-04): WindowState.getOnScreen / WindowControl show + focus for the asking main window.
const { windowOnScreen, raiseWindow } = require("./popout-r4f-window.cjs");
const {appMenuTemplate,refreshZoomMenu,sidebarCollapsedPatch,navigationState,menuState,sameMenuState,closeAction,activateAction,splitMenuState} = require("./app-menu.cjs");
const { menuZoomLevel, settleWindowZoom, applyWindowZoom, archiveParentCascade } = require("./r4h-main-glue.cjs");
const {windowBackground,trafficLightPosition,scaleTrafficLights,zoomLevelAfter,clampZoomFactor,ZOOM_HINT_KEY,zoomFactorHint} = require("./window-chrome.cjs");
const { preferredSystemLanguages } = require("./system-languages.cjs");
const {contextMenuTemplate,externalLink} = require("./context-menu.cjs");
const {DEFAULT_WINDOW_SIZE,WINDOW_STATE_FILE,loadWindowState,windowStateBounds,restoreWindowState,trackWindowState,windowStateFile,cascadeWindowState,forgetWindowState,placeOnDisplays,positionWindowState} = require("./window-state.cjs");
// The pane windows open at a quit come back at the next launch (popout-restore.cjs; Claude Desktop's popout restore).
const popoutRestore = require("./popout-restore.cjs");
// Every main window (File › New Window, a session's "Open in new window", split view inside each): event routing,
// per-window menu state and the windows reopened at launch (window-registry.cjs; its header documents the helpers
// pane services use to find the window a request came from).
const {MAIN_WINDOW_KEY,OPEN_WINDOWS_FILE,MAX_WINDOWS,MAX_SESSION_POPOUTS,WINDOW_KINDS,newWindowKey,createWindowRegistry,sidePanePopoutsForSession} = require("./window-registry.cjs");
const windowRegistry = createWindowRegistry({ file: () => path.join(app.getPath("userData"), OPEN_WINDOWS_FILE), BrowserWindow });
let menuBar;
// Set by the app "before-quit" listener (index.chunk-ChZ67Jhw.js kk()): only a
// quit lets the main window's "close" through; otherwise it hides.
let quitting = false;
// True once the main window was hidden by its close handler; a menu command
// for the renderer brings it back (Zxr) and its "show" event clears it.
let mainHidden = false;
const {mcpDefinitions,storageReport,storageCoreRoot,editConfigTarget,recordSettingsFailure} = require("./settings-pages.cjs");
// R3b-settings cov0-04: the original DeviceStorage free-space reading (2.42304.0 YAr, generated by scripts/extract-r3b-settings.mjs).
const { freeDiskSpace } = require("./generated/r3b-settings-free-disk.cjs");
const { createThemeFiles } = require("./theme-files.cjs");
const {createHarnessProfile} = require("./harness-profile.cjs");
const {createInstructionsService} = require("./instructions-service.cjs");
const { createPersonaImage } = require("./persona-image.cjs");
const { createModelSettings } = require("./model-settings.cjs");
const { createCustomCommands } = require("./custom-commands.cjs");
// OpenClaude Desktop's own MCP server for every core (agent-tools-host.cjs: tool modules in ./agent-tools, a private socket)
// and the Preview pane's browser and dev servers (preview-service.cjs). The tools act on the calling session only.
const { createAgentToolsHost } = require("./agent-tools-host.cjs");
const { createAgentToolApproval } = require("./agent-tool-approval.cjs");
const { createPreviewService } = require("./preview-service.cjs");
const { createTaskBacklog, publicItem: publicBacklogItem, folderKey: taskBacklogFolderKey } = require("./task-backlog.cjs");
const { sessionErrorPatch } = require("./session-attention.cjs");
let previewService = null;
const agentToolSession = (id) => {
  if (typeof id !== "string" || !config || ![...config.threadIds, ...config.archivedThreadIds].includes(id)) return null;
  const cwd = config.threadMetadata[id]?.cwd;
  return typeof cwd === "string" && path.isAbsolute(cwd) ? { id, cwd } : null;
};
const agentToolApproval = createAgentToolApproval({ dialog, t: (source, values) => i18n ? i18n.t(source, values) : String(source).replace(/\{(\w+)\}/g, (match, key) => values?.[key] ?? match),
  assistant: () => chosenAssistant(), windowFor: (sessionId) => {
    // The window that shows the session (the focused one first), else the window focused last.
    const showing = windowRegistry.windowsShowing(sessionId), focused = windowRegistry.lastFocused();
    return (showing.includes(focused) ? focused : showing[0]) ?? focused ?? (win && !win.isDestroyed() ? win : null);
  },
  // Every sheet names the session asking and its folder, and says so when the window it opens on shows another one.
  describeSession: (session, window) => {
    const metadata = config?.threadMetadata?.[session?.id] ?? {};
    const raw = [metadata.name, metadata.preview].find((value) => typeof value === "string" && value.trim())?.trim().replace(/\s+/g, " ") ?? "";
    const title = raw.length > 60 ? `${raw.slice(0, 59)}\u2026` : raw;
    const cwd = typeof session?.cwd === "string" ? session.cwd : metadata.cwd;
    const home = os.homedir();
    const folder = typeof cwd === "string" && cwd ? (cwd === home ? "~" : cwd.startsWith(home + path.sep) ? `~${cwd.slice(home.length)}` : cwd) : "";
    return { title, folder, shown: window ? windowRegistry.windowsShowing(session?.id).includes(window) : null };
  } });
// Settings › Code › Preview: "Let DeepSeek use the preview" (unset reads as on).
// Code › Dynamic workflows: the Workflow tool only while workflows are on and the running core uses OpenClaude Desktop's engine.
// R4g-mcp MA-2: the built-in visualize tools (agent-tools/visualize.mjs, official GrowthBook 3444158716) are on by D35 (unset reads as on).
const agentToolGroupEnabled = (group) => group === "workflow" ? (() => { try { return workflowSettings().enabled && currentWorkflowEngine() === "codeDesktop"; } catch { return false; } })() : group === "visualize" ? config?.agentVisualize !== false : group !== "preview" || config?.agentPreview !== false;
// R4g-mcp MA-4: the MCP App bridge (desktop:call mcp-app:*): the built-in visualize server directly, the core's servers
// through Codex's mcpServerStatus/list and mcpServer/resource/read (or a core reporting "mcpApps"); other cores: core_unsupported.
const mcpAppsHost = require("./mcp-apps-host.cjs").createMcpAppsHost({ client: () => client, session: agentToolSession,
  visualizeEnabled: () => agentToolGroupEnabled("visualize"), ownServerName: () => agentTools.SERVER_NAME, log: console,
  coreSupportsMcpApps: (info) => coreForEngine(info?.engine).id === "codex" || coreSupports(info, "mcpApps") });
// Bypass permissions runs everything without asking, the app's own tools included: a terminal command, an outside site
// or a launch.json dev server the agent starts in a Bypass session needs no sheet (Workflow decides on its own, as
// Claude Code does). The session's Mode is the one its last turn ran with (workflow-tool-service.cjs sessionAccess).
// A Monitor command, a scheduled prompt and a web page WebFetch reads ask the same way (agent-tools/monitor.mjs,
// schedule.mjs, web.mjs).
const BYPASS_KINDS = new Set(["terminal-command", "preview-site", "preview-server", "monitor", "schedule", "web-fetch", "notebook-edit", "open-path"]);
async function agentToolAsk(session, request, options = {}) {
  if (BYPASS_KINDS.has(request?.kind) && typeof session?.id === "string") {
    let access = null;
    try { access = await workflowToolService?.sessionAccess(session.id); } catch { access = null; }
    if (access === "danger-full-access") return true;
  }
  // The session's own approval card, like the core's command and file approvals: in its transcript, in every window
  // and split side that shows it, with the card's shortcuts; the sidebar marks the session meanwhile. The native
  // sheet only when no core connection can carry the card.
  const answer = await agentToolCard(session, request, options);
  if (answer !== undefined) return answer;
  return agentToolApproval(session, request, options);
}
const cardText = (value, max = 4000) => typeof value === "string" ? (value.length > max ? `${value.slice(0, max)}…` : value) : undefined;
/** The card for one agent-tool request (approval-card-model.mjs agentToolCard reads params.codeDesktop.agentTool). */
async function agentToolCard(session, request = {}, { signal, call } = {}) {
  const owner = client;
  if (!owner || typeof owner.localApproval !== "function" || typeof session?.id !== "string" || !config?.threadIds?.includes(session.id)) return undefined;
  const kind = ["terminal-command", "preview-site", "preview-server", "workflow", "monitor", "schedule", "web-fetch", "notebook-edit", "open-path"].includes(request.kind) ? request.kind : "other";
  const { shellLine, launchEnvSummary } = require("./agent-tool-approval.cjs");
  const command = kind === "terminal-command" || kind === "monitor" ? cardText(String(request.command ?? "")) : kind === "preview-server" ? cardText(shellLine(request.command, request.args)) : undefined;
  const tool = { kind };
  if (kind === "terminal-command") Object.assign(tool, { title: cardText(request.title, 200), tabTitle: cardText(request.tabTitle ?? request.tab, 200), detail: cardText(request.detail) });
  if (kind === "preview-site") Object.assign(tool, { host: cardText(request.host, 300), url: cardText(request.url, 2000) });
  // The configuration's env is part of what is approved (preview-service fingerprints it): the card shows it, and names
  // the variables that change which program runs (PATH, NODE_OPTIONS, DYLD_*, …).
  // R3-toolcards TT-09: the launch.json port and whether it may be reassigned (c96d752d0 Kk preview_start: "Runs in {cwd} on port {port}").
  if (kind === "preview-server") { const env = launchEnvSummary(request.env); Object.assign(tool, { name: cardText(request.name, 200), env: env.lines.map((line) => cardText(line, 300)), envMore: env.more, envRisky: env.risky.slice(0, 20), ...(Number.isInteger(request.port) && request.port > 0 ? { port: request.port } : {}), portMayReassign: request.portMayReassign === true }); }
  if (kind === "monitor") Object.assign(tool, { description: cardText(request.description, 200) });
  if (kind === "schedule") Object.assign(tool, { cron: cardText(request.cron, 200), humanSchedule: cardText(request.humanSchedule, 200), prompt: cardText(request.prompt), recurring: request.recurring !== false });
  if (kind === "web-fetch") Object.assign(tool, { host: cardText(request.host, 300), url: cardText(request.url, 2000) });
  if (kind === "open-path") Object.assign(tool, { action: request.action === "editor" ? "editor" : "reveal", path: cardText(request.path, 2000), editor: cardText(request.editor, 100), ...(Number.isInteger(request.line) ? { line: request.line } : {}) });
  if (kind === "notebook-edit") Object.assign(tool, { path: cardText(request.path, 2000), mode: ["replace", "insert", "delete"].includes(request.mode) ? request.mode : "replace", cellId: cardText(request.cellId, 200), source: cardText(request.source) });
  if (kind === "workflow") {
    let args;
    if (request.args !== undefined) { try { args = JSON.stringify(request.args); } catch { args = String(request.args); } }
    // script: bounded as Claude's dialog bounds it (200,000 characters; scriptTruncated says the rest isn't shown).
    const script = typeof request.script === "string" && request.script.trim() ? request.script : null;
    Object.assign(tool, { name: cardText(request.name ?? request.displayName, 200), description: cardText(request.description), always: typeof request.name === "string" && !!request.name && request.always !== false, note: cardText(request.note),
      ...(script ? { script: script.slice(0, 200000), ...(script.length > 200000 ? { scriptTruncated: true } : {}) } : {}),
      phases: (Array.isArray(request.phases) ? request.phases : []).filter((phase) => phase && typeof phase.title === "string").slice(0, 50).map((phase) => ({ title: cardText(phase.title, 300), ...(typeof phase.detail === "string" ? { detail: cardText(phase.detail, 600) } : {}) })),
      ...(args !== undefined ? { args: cardText(args, 2000) } : {}) });
  }
  if (kind === "other") Object.assign(tool, { title: cardText(request.title, 300), detail: cardText(request.detail) });
  const params = {
    // turnId: the session's running turn, so the turn's end expires the card (approval-transport.cjs expireTurn).
    threadId: session.id, turnId: liveWork.turnOf(session.id) ?? "", itemId: typeof call?.itemId === "string" ? call.itemId : `code-desktop-tool-${require("node:crypto").randomUUID()}`, startedAtMs: Date.now(),
    ...(command ? { command } : {}), ...(typeof (request.cwd ?? session.cwd) === "string" ? { cwd: request.cwd ?? session.cwd } : {}),
    sessionGrantable: (kind === "workflow" && tool.always) || kind === "web-fetch", codeDesktop: { agentTool: tool },
  };
  const result = await owner.localApproval("item/commandExecution/requestApproval", params, { signal, outlivesTurn: agentToolCallOutlivesTurn(call, owner) });
  if (result === undefined) return undefined;
  const decision = result?.decision;
  const approved = !signal?.aborted && (decision === "accept" || decision === "acceptForSession");
  if (kind === "workflow") return { approved, always: approved && decision === "acceptForSession" && tool.always };
  // WebFetch: "Allow for this session" lets the site's pages be read again without asking (agent-tools/web.mjs).
  if (kind === "web-fetch") return { approved, always: approved && decision === "acceptForSession" };
  return approved;
}
/**
 * Whether the running core's agents keep working after the turn that started them ends (background sub-agents and
 * workflow agents: DeepSeek, Kimi, Qwen, OpenCode, …) and make their OpenClaude Desktop tool calls as the session without
 * naming their own thread: capabilities.backgroundAgents, else every core but a native one. Codex names the calling
 * thread on every call instead (agent-tools-host.cjs cancelThread).
 */
function coreKeepsBackgroundAgents(owner = client) {
  let reported, kind = null;
  try { reported = coreCapabilities(owner?.serverInfo ?? null).backgroundAgents; kind = coreForEngine(owner?.serverInfo?.engine).kind; } catch { reported = undefined; }
  return typeof reported === "boolean" ? reported : kind !== "native";
}
/** An OpenClaude Desktop tool call whose approval card must not expire with the session's turn: a sub-agent's, or any call
 * on a core whose background agents outlive the turn (their calls are cancelled when the work they belong to stops). */
function agentToolCallOutlivesTurn(call, owner = client) {
  return call?.subAgent === true || coreKeepsBackgroundAgents(owner);
}
/** The app tool groups the running core gets only through load_tools (it has no tool search of its own, and reads the
 * list again on tools/list_changed: capabilities.deferAppTools, core-registry.mjs). */
function agentToolsDeferred(owner = client) {
  let defer = false;
  try { defer = coreCapabilities(owner?.serverInfo ?? null).deferAppTools === true; } catch { defer = false; }
  return defer ? ["workflow", "monitor", "schedule", "findings", "notebook", "window"] : [];
}
/** Whether the running core gets an app tool: always, unless the tool stands in for one the core lists in nativeTools. */
function agentToolServedToCore(tool, owner = client, session = null) {
  if (!tool?.native) return true;
  let native = [];
  try { native = coreCapabilities(owner?.serverInfo ?? config?.core ?? null).nativeTools; } catch { native = []; }
  // Codex reads pages through its hosted web search (open_page / find_in_page) unless that is off for the session: then
  // it gets WebFetch, as Claude keeps WebFetch with web search off.
  if (tool.native === "WebFetch" && codexWebSearchOn(owner, session)) return false;
  return !(Array.isArray(native) && native.includes(tool.native));
}
// The web_search each Codex session runs with, by the identity its OpenClaude Desktop server names (a start token, then the
// thread id too): Settings › Code › Web search's thread override, else config.toml's (config/read), recorded when the
// thread/start|resume request is decorated, before Codex starts the thread's server and lists its tools.
const codexWebSearchModes = new Map();
function rememberCodexWebSearch(identity, mode) {
  if (typeof identity !== "string" || !identity || typeof mode !== "string") return;
  codexWebSearchModes.delete(identity);
  codexWebSearchModes.set(identity, mode);
  while (codexWebSearchModes.size > 1000) codexWebSearchModes.delete(codexWebSearchModes.keys().next().value);
}
function codexWebSearchOn(owner, session = null) {
  let codex = false;
  try { codex = coreForEngine(owner?.serverInfo?.engine).kind === "native"; } catch { codex = false; }
  if (!codex) return false;
  const mode = typeof session === "string" ? codexWebSearchModes.get(session) : undefined;
  if (typeof mode === "string") return mode !== "disabled";
  // A session not recorded (another program's thread, a fork): the launch flags (a custom model endpoint launches
  // with web_search="disabled", prefs/codex-provider.mjs).
  const args = Array.isArray(owner?.child?.spawnargs) ? owner.child.spawnargs : [];
  return !args.some((arg) => typeof arg === "string" && /^web_search\s*=\s*"?disabled"?$/.test(arg));
}
const agentTools = createAgentToolsHost({
  resolveSession: (named, meta) => agentToolSession(named) ?? agentToolSession(meta?.threadId),
  isGroupEnabled: agentToolGroupEnabled,
  // Codex never reads the list again after a session starts (it ignores tools/list_changed, and config/mcpServer/reload
  // doesn't re-list either): it is offered every group that could apply, so turning Dynamic workflows or the preview
  // on reaches its open sessions; a call while one is off is refused with the setting's name. Its Workflow tool is
  // listed only while OpenClaude Desktop's engine runs its workflows (always, for Codex). The bridges whose agents ignore
  // the notice reopen their sessions instead (codeDesktop/appTools/changed, sent below).
  isGroupListed: (group) => {
    let native = false;
    try { native = coreForEngine(client?.serverInfo?.engine).kind === "native"; } catch { native = false; }
    if (!native) return agentToolGroupEnabled(group);
    return group !== "workflow" || (() => { try { return currentWorkflowEngine() === "codeDesktop"; } catch { return false; } })();
  },
  // A tool standing in for a Claude tool the running core has itself (its nativeTools capability) isn't served to it.
  isToolListed: (tool, server) => agentToolServedToCore(tool, client, server?.session ?? null),
  // DeepSeek, OpenCode and MiMo send every tool definition with each model request and have no tool search
  // (capabilities.deferAppTools): the long, rarely used groups wait behind code_desktop load_tools there (about 18k
  // characters less per request, and per sub-agent and workflow agent step).
  deferredGroups: () => agentToolsDeferred(),
  requestApproval: (session, request, options) => agentToolAsk(session, request, options),
  // Codex's /review delegate keeps the session's MCP servers (codex-rs core/src/tasks/review.rs clones the config with
  // approvals off and a read-only sandbox, which OpenClaude Desktop's own tools aren't under): while a session is reviewing,
  // only the tools that read pass, and nothing asks (the Review dialog promises a read-only review without prompts).
  refuseCall: (session, tool) => sessionOperations.isReviewing(session?.id) && !REVIEW_APP_TOOLS.has(tool)
    ? `${tool} isn’t available during a review: a review only reads. Finish the review; the user can ask for changes afterwards.` : null,
});
// The terminal tools (agent-tools/terminal.mjs) use the terminal pane's service (terminal-service.cjs, created below;
// the factory runs per call, after it exists).
agentTools.provide("terminals", () => terminalService);
// The Workflow tool (agent-tools/workflow.mjs) launches through workflow-tool-service.cjs for the calling session.
agentTools.provide("workflows", (session, ctx) => ({ launch: (args) => {
  if (!workflowToolService) throw new Error("Dynamic workflows aren’t ready yet.");
  if (!workflowSettings().enabled || currentWorkflowEngine() !== "codeDesktop") throw new Error("The Workflow tool isn’t available: this session’s workflows run on the agent’s own engine.");
  // The call's signal: a stopped turn closes the approval sheet and starts nothing.
  // Codex names its tool call: the run remembers it (the <task-notification>'s tool-use-id) and its card sits there.
  return workflowToolService.launch(args, { sessionId: session.id, cwd: session.cwd, signal: ctx?.signal, toolUseId: ctx?.call?.callId ?? ctx?.call?.itemId ?? undefined, after: ctx?.call?.itemId ?? undefined });
}, stop: (args) => {
  if (!workflowToolService) throw new Error("Dynamic workflows aren’t ready yet.");
  return workflowToolService.stop(args, { sessionId: session.id });
} }));
// turn-plan: the ccd_turn tools' main-process side (agent-tools/turn-plan.mjs, the same module instance the host loads):
// the next actions the renderer publishes, the PostToolUse / SessionStart(compact) hooks over the cores' notifications, and
// the compaction reminder in front of the next turn/start.
let turnPlanTools = null;
import(require("node:url").pathToFileURL(path.join(__dirname, "agent-tools/turn-plan.mjs")).href).then((module) => { turnPlanTools = module; }, (error) => console.warn("Turn plan tools:", error?.message ?? error));
import(require("node:url").pathToFileURL(path.join(__dirname, "agent-tools/workflow.mjs")).href).then((module) => module.setDescriptionSource(() => {
  const resolved = workflowSettings();
  return { sizeGuideline: resolved.sizeGuideline, sizeIsDefault: resolved.sizeSource === "default", nameOnly: resolved.nameOnly };
}), (error) => console.warn("Workflow tool description:", error?.message ?? error));
agentTools.provide("preview", (session, ctx) => {
  if (!previewService) throw new Error("The preview isn’t ready yet.");
  return previewService.forSession(session, { requestApproval: (request, options) => agentToolAsk(session, request, { ...options, call: ctx?.call }), signal: ctx?.signal ?? null });
});
// AskUserQuestion (agent-tools/ask.mjs, for a core without its own question tool): the session's question card, as a
// core's item/tool/requestUserInput shows it, answered here (CodexClient.localApproval). The call's signal (a stopped
// turn) closes it unanswered; undefined when no connection can carry the card.
agentTools.provide("questions", (session, ctx) => ({ ask: (questions) => {
  const owner = client;
  if (!owner || typeof owner.localApproval !== "function" || !config?.threadIds?.includes(session.id)) return Promise.resolve(undefined);
  const itemId = typeof ctx?.call?.itemId === "string" ? ctx.call.itemId : `code-desktop-tool-${require("node:crypto").randomUUID()}`;
  return owner.localApproval("item/tool/requestUserInput", { threadId: session.id, turnId: liveWork.turnOf(session.id) ?? "", itemId, questions }, { signal: ctx?.signal, outlivesTurn: agentToolCallOutlivesTurn(ctx?.call, owner) });
} }));
// PushNotification (agent-tools/notify.mjs): a notification for the calling session (desktop-settings.cjs notifyAgent).
agentTools.provide("notifications", (session) => ({ send: ({ title, message } = {}) => desktopSettings ? desktopSettings.notifyAgent(session.id, { title, message }) : "unsupported" }));
// Monitor (agent-tools/monitor.mjs): commands watched outside the core (monitor-service.cjs); each event reaches the
// session as a <task-notification> turn once it is idle, as a workflow's does. The Background tasks pane lists and
// stops them (desktop:call monitor-state / monitor-stop).
const monitorService = require("./monitor-service.cjs").createMonitorService({
  deliver: (threadId, notification) => workflowToolService?.notice(threadId, { notification }),
  emit: (event) => emit(event),
  env: () => { const env = { ...process.env }; for (const key of [...coreSecretEnvKeys(), "CODE_DESKTOP_AGENT_TOOLS_TOKEN", "CODE_DESKTOP_AGENT_TOOLS_SOCKET", "CODE_DESKTOP_AGENT_TOOLS_SERVER"]) delete env[key]; return env; },
  ...(process.env.CODE_DESKTOP_TERMINAL_SHELL ? { shell: process.env.CODE_DESKTOP_TERMINAL_SHELL } : {}),
});
agentTools.provide("monitors", (session) => ({
  start: (options) => monitorService.start({ ...options, sessionId: session.id, cwd: session.cwd }),
  stop: (id) => monitorService.stop(session.id, id, { by: "agent" }),
  list: () => monitorService.list(session.id),
}));
// CronCreate / CronList / CronDelete (agent-tools/schedule.mjs): session-only jobs (schedule-service.cjs) that fire
// only while their session is idle, as a new turn with its last turn options. Listed and stopped in the Background
// tasks pane (desktop:call schedule-state / schedule-stop).
const scheduleService = require("./schedule-service.cjs").createScheduleService({
  deliver: (threadId, prompt) => !config?.threadIds?.includes(threadId) ? "gone" : workflowToolService ? workflowToolService.notice(threadId, { prompt }) : false,
  isIdle: (threadId) => !!workflowToolService?.idle(threadId),
  emit: (event) => emit(event),
});
agentTools.provide("schedules", (session) => ({
  check: (options) => scheduleService.check(options),
  create: (options) => scheduleService.create(session.id, options),
  list: () => scheduleService.list(session.id),
  remove: (id) => scheduleService.remove(session.id, id),
}));
// list_sessions / get_session / set_session_title (agent-tools/sessions.mjs): the app's session list, read-only, and
// the calling session's own title (thread/name/set, as the sidebar's Rename sends it).
function agentToolSessionView(id, running) {
  const archived = !!config?.archivedThreadIds?.includes(id);
  if (!archived && !config?.threadIds?.includes(id)) return null;
  const metadata = config.threadMetadata?.[id] ?? {};
  const title = [metadata.name, metadata.preview].find((value) => typeof value === "string" && value.trim())?.trim().replace(/\s+/g, " ") ?? "";
  return { id, title: title.length > 120 ? `${title.slice(0, 119)}\u2026` : title, folder: typeof metadata.cwd === "string" ? metadata.cwd : null, archived,
    running: running.has(id), updatedAt: Number.isFinite(metadata.updatedAt) ? metadata.updatedAt : Number.isFinite(metadata.createdAt) ? metadata.createdAt : null };
}
agentTools.provide("sessions", (session) => ({
  list: () => { const running = liveWork.sessions(); return [...(config?.threadIds ?? []), ...(config?.archivedThreadIds ?? [])].map((id) => agentToolSessionView(id, running)).filter(Boolean); },
  get: (id) => agentToolSessionView(id, liveWork.sessions()),
  // list_events: the session's turns (the core's thread/read with its turns), for a session the user @-mentions.
  turns: async (id) => {
    const owner = client;
    if (!owner || !agentToolSessionView(id, liveWork.sessions())) throw new Error(`No session ${id}.`);
    const read = await owner.request("thread/read", { threadId: id, includeTurns: true });
    return Array.isArray(read?.thread?.turns) ? read.thread.turns : [];
  },
  rename: async (name) => {
    const owner = client;
    if (!owner || !config?.threadIds?.includes(session.id)) throw new Error("This session can’t be renamed right now.");
    await owner.request("thread/name/set", { threadId: session.id, name });
    if (config.threadMetadata[session.id]) { config.threadMetadata[session.id].name = name; save(); }
    emit({ kind: "session-list", op: "renamed", threadId: session.id, name });
  },
}));
// reveal_path / open_in_editor (agent-tools/host.mjs): Finder, and the Open in menu's editors (editors.cjs); an editor
// with a file URL scheme opens at the line.
const EDITOR_URL_SCHEMES = { vscode: "vscode", vscodeInsiders: "vscode-insiders", cursor: "cursor", windsurf: "windsurf", zed: "zed" };
agentTools.provide("host", () => ({
  editors: () => require("./editors.cjs").installedEditors(),
  reveal: async (target) => { shell.showItemInFolder(target); return true; },
  openInEditor: async (target, type, { line = null, column = null } = {}) => {
    const scheme = EDITOR_URL_SCHEMES[type];
    if (line && scheme && require("./editors.cjs").installedEditors().some((editor) => editor.type === type)) {
      await shell.openExternal(`${scheme}://file${encodeURI(target)}:${line}${column ? `:${column}` : ""}`);
      return { line: true };
    }
    await require("./editors.cjs").openInEditor(target, type);
    return { line: line ? false : undefined };
  },
}));
// NotebookEdit (agent-tools/notebook.mjs) follows the session's Mode: its access and permission as its last turn ran.
agentTools.provide("access", (session) => ({ get: async () => ({ access: await workflowToolService?.sessionAccess(session.id) ?? "read-only", permission: workflowToolService?.permissionOf(session.id) ?? null }) }));
// WebFetch (agent-tools/web.mjs): Electron's network stack (the system proxy and certificates), outside the core,
// without the app's cookies. One hop per call: a redirect answers as a 3xx Response carrying its Location, so the tool
// checks every host it is sent to (net.fetch's redirect: "manual" fails instead of answering).
function agentToolFetch(url, { signal, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const { net } = require("electron");
    let request;
    try { request = net.request({ url, method: "GET", redirect: "manual", credentials: "omit", useSessionCookies: false, cache: "no-store" }); } catch (error) { reject(error); return; }
    let settled = false;
    const done = (fn, value) => { if (settled) return; settled = true; signal?.removeEventListener?.("abort", abort); fn(value); };
    const abort = () => { try { request.abort(); } catch { /* gone */ } done(reject, signal?.reason ?? new Error("The fetch was stopped.")); };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener?.("abort", abort, { once: true });
    for (const [key, value] of Object.entries(headers)) { try { request.setHeader(key, String(value)); } catch { /* skipped */ } }
    request.on("redirect", (status, _method, location) => done(resolve, new Response(null, { status, headers: { location } })));
    request.on("response", (response) => {
      const head = new Headers();
      for (const [key, value] of Object.entries(response.headers ?? {})) { try { head.set(key, Array.isArray(value) ? value.join(", ") : String(value)); } catch { /* skipped */ } }
      const body = [101, 204, 205, 304].includes(response.statusCode) ? null : require("node:stream").Readable.toWeb(response);
      done(resolve, new Response(body, { status: response.statusCode, statusText: response.statusMessage || "", headers: head }));
    });
    request.on("error", (error) => done(reject, error));
    request.end();
  });
}
agentTools.provide("web", () => ({ fetch: agentToolFetch }));
// B27 get_window_layout / open_session_in / close_split / set_sidebar_collapsed (agent-tools/window.mjs; c2189a16b
// runLayoutCommand): the window holding the calling session (a full window first, else its popout, else the full window
// focused last, which then reports the caller not visible) decides and applies the command (main.jsx
// runLayoutCommandHere) and answers through layout-command-result; "window" opens a session popout here, shown
// without taking focus. An answer that does not come in time is "expired".
const LAYOUT_COMMAND_TIMEOUT_MS = 5000;
const layoutRequests = new Map();
let layoutRequestSeq = 0;
function runAgentLayoutCommand(sessionId, command) {
  const showing = windowRegistry.windowsShowing(sessionId), focused = windowRegistry.lastFocused();
  const full = showing.filter((window) => !windowRegistry.isSessionPopout(window));
  const window = (full.includes(focused) ? focused : full[0]) ?? showing[0] ?? windowRegistry.lastFocusedFull();
  if (!liveContents(window)) return Promise.resolve({ outcome: "refused", reason: "caller_not_visible" });
  const requestId = `layout-${++layoutRequestSeq}`;
  const sessions = windowRegistry.sessionPopouts();
  return new Promise((resolve) => {
    const timer = setTimeout(() => { layoutRequests.delete(requestId); resolve({ outcome: "failed", reason: "expired" }); }, LAYOUT_COMMAND_TIMEOUT_MS);
    layoutRequests.set(requestId, { window, resolve: (value) => { clearTimeout(timer); layoutRequests.delete(requestId); resolve(value); } });
    windowRegistry.send(window, { kind: "layout-command", requestId, command: { ...command, callerSessionId: sessionId },
      windowHidden: !window.isVisible() || window.isMinimized() || windowRegistry.getState(window, "hidden") === true,
      popoutSessionIds: sessions.map((entry) => entry.sessionId).filter(Boolean), otherPopoutCount: popouts.size + sessions.filter((entry) => !entry.sessionId).length });
  });
}
agentTools.provide("layout", (session) => ({ run: (command) => runAgentLayoutCommand(session.id, command) }));
const AGENT_SESSION_KEY = `mcp_servers.${agentTools.SERVER_NAME}.env.CODE_DESKTOP_AGENT_SESSION`;
const AGENT_TOKEN_KEY = `mcp_servers.${agentTools.SERVER_NAME}.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN`;
// thread/start and thread/fork carry a start identity (bound to the new thread below), thread/resume the thread
// itself: Codex reads it as a thread config override, the bridges pass it to the server they start for the session.
// Only a core that has the server: Codex when this app launched it with the -c definition (a session override naming a
// server Codex doesn't define fails thread/start), never another native program; the DeepSeek core and the bridges
// read the key themselves.
function coreTakesAgentTools(owner) {
  if (coreForEngine(owner?.serverInfo?.engine).kind !== "native") return true;
  const args = Array.isArray(owner?.child?.spawnargs) ? owner.child.spawnargs : [];
  return args.some((arg) => typeof arg === "string" && arg.startsWith(`mcp_servers.${agentTools.SERVER_NAME}.command=`));
}
// Codex's request_user_input works in Default mode too (codex-default-questions.cjs), so it needs no AskUserQuestion.
const { defaultModeQuestions } = require("./codex-default-questions.cjs");
function decorateAgentTools(method, params, owner = client) {
  params = defaultModeQuestions(method, params, { native: coreForEngine(owner?.serverInfo?.engine).kind === "native", stages: owner?.connection?.featureStages ?? null });
  if (!params || typeof params !== "object" || !["thread/start", "thread/resume", "thread/fork"].includes(method) || !agentTools.socketPath || !coreTakesAgentTools(owner)) return params;
  const identity = agentTools.sessionIdentity(method === "thread/resume" ? params.threadId : null);
  params.config = { ...(params.config && typeof params.config === "object" ? params.config : {}), [AGENT_SESSION_KEY]: identity };
  // A fork runs with its parent's web search (thread config is inherited): so does its WebFetch.
  if (method === "thread/fork" && codexWebSearchModes.has(params.threadId)) rememberCodexWebSearch(identity, codexWebSearchModes.get(params.threadId));
  // Codex: the thread's server carries that session's own credential (agent-tools-host.cjs sessionToken; a thread-level
  // env value wins over the launch's env_vars, checked against codex 0.155.1), so its process holds nothing that acts
  // for another session. The bridges derive it themselves from the identity.
  if (coreForEngine(owner?.serverInfo?.engine).kind === "native") params.config[AGENT_TOKEN_KEY] = agentTools.sessionToken(identity);
  return params;
}
function bindAgentTools(params, thread) {
  const identity = params?.config?.[AGENT_SESSION_KEY];
  if (typeof identity === "string" && thread && typeof thread.id === "string") agentTools.bindThread(identity, thread.id);
  // A fork's or side chat's server names the thread itself: it serves WebFetch as the thread's own did.
  if (typeof identity === "string" && typeof thread?.id === "string" && codexWebSearchModes.has(identity)) rememberCodexWebSearch(thread.id, codexWebSearchModes.get(identity));
}
// decorateThread: Settings › Models' Codex provider on fork / resume (model-settings.cjs, created below).
const sessionOperations = createSessionOperations({ getClient: () => client, getConfig: () => config, save, emit,
  decorateThread: (method, params, owner) => decorateAgentTools(method, modelSettings.decorateThread(method, params, owner) ?? params, owner), onThreadCreated: bindAgentTools });
// Persistent /btw lifecycle (2.37337.1). Kept separate from the legacy floating
// sideQuestion transport used by cores without persistent child support.
const btwSessions = createBtwSessions({ getClient: () => client, getConfig: () => config, save,
  defaultTitle: () => i18n ? i18n.t("Side chat") : "Side chat",
  decorateThread: (method, params, owner) => decorateAgentTools(method, modelSettings.decorateThread(method, params, owner) ?? params, owner),
  onThreadCreated: bindAgentTools,
  hasParentLoop: id => activeGoals.has(id) || scheduleService.list(id).length > 0,
  busy: id => windowRegistry.windowsShowing(id).length > 0 || liveWork.sessions().has(id) || sessionOperations.isActive(id) || activeGoals.has(id) ||
    scheduleService.list(id).length > 0 || monitorService.list(id).some(entry => entry.status === "running"),
  reserve: id => { try { return sessionOperations.reserveMessage(id); } catch { return null; } },
  hasBackgroundWork: async (owner, id) => {
    // An unavailable snapshot is not evidence that the child is settled.
    try { const result = await owner.request("thread/backgroundTerminals/list", { threadId: id, limit: 100 });
      return !Array.isArray(result?.data) || !!result.nextCursor || result.data.some(entry => !["completed", "exited"].includes(entry?.status));
    } catch { return true; }
  },
  hasQueuedInput: async (owner, id) => {
    try {
      const result = await owner.request("thread/queue/list", { threadId: id }, undefined, owner.connection);
      return !Array.isArray(result?.data) || result.data.length > 0 || !!result.nextCursor;
    } catch { return true; }
  },
  onChanged: (op, thread) => {
    if (op === "archived") {
      agentTools.cancelSession(thread.id, "The session was archived.");
      monitorService.stopSession(thread.id); scheduleService.removeSession(thread.id);
      // R4g-btw BT3 (X7-14): an archived /btw child is evicted as any session is (closeSidePanePopoutsForSession).
      if (!windowRegistry.windowsShowing(thread.id, { panes: true, side: true }).length) closeSidePanePopoutsForSession(thread.id);
    }
    if (op !== "metadata") emitSessionList(op, op === "archived" ? thread.id : thread);
    config.sidebarRevision = (config.sidebarRevision || 0) + 1;
    save(); emit({ kind: "sidebar-state", state: sidebarSnapshot() });
  } });
// Skills / Connectors / Plugins catalog (skills/list, mcpServerStatus/list,
// plugin/installed, ...): validated operations, never the raw rpc allowlist.
const customizeOperations = createCustomizeOperations({ getClient: () => client, getConfig: () => config, knownCwd: (cwd) => workspaceQueryRoot(cwd),
  // Skill folders: open in Finder, and a new SKILL.md in the default editor (customize skill-root).
  openPath: (target) => shell.openPath(target) });
// Settings › Code › Memories and Beta features on the Codex core (codex-features.cjs: /memories, /experimental).
const codexFeatures = require("./codex-features.cjs").createCodexFeatures({ getClient: () => client });
const themeFiles = createThemeFiles({ dialog, getWindow: () => win });
const harnessProfile = createHarnessProfile({app,shell,dialog,getConfig:()=>config,getClient:()=>client,emit,getWindow:()=>win});
const instructionsService = createInstructionsService({getConfig:()=>config,getClient:()=>client,shell,knownCwd:(cwd)=>workspaceQueryRoot(cwd)});
// context-breakdown: the session rail Context card's categories (the core's own counts, else the host's estimates).
const contextUsageService = require("./context-usage-service.cjs").createContextUsageService({ getClient: () => client, getConfig: () => config, coreSupports,
  sessionToolLists: (threadId) => agentTools.sessionToolLists(threadId),
  appServerInstructions: (owner) => { try { return coreForEngine(owner?.serverInfo?.engine).kind === "native" ? null : require("./agent-tools-instructions.cjs").INSTRUCTIONS; } catch { return null; } },
  systemPromptText: async ({ threadId, cwd }) => (await instructionsService.run({ op: "system-prompt", threadId, cwd })).text,
  instructionFiles: async (cwd) => (await instructionsService.run({ op: "core-files", cwd })).files,
  projectInstructions: async (cwd) => { const preview = await instructionsService.run({ op: "preview", cwd }); return { text: preview.instructions, path: preview.file?.path }; } });
const personaImage = createPersonaImage({ dialog, getWindow: () => win });
// setCodexLaunch / codexCommand: the Codex endpoint's launch overrides and the binary whose bundled catalog they extend.
const modelSettings = createModelSettings({ getConfig: () => config, getClient: () => client, app, getHarnessProfile: () => harnessProfile,
  setCodexLaunch, codexCommand: codexBinary });
// Code › Local › "Edit local environment" (local-environment.cjs): the user's variables, encrypted, added to every
// core spawn (codex.cjs setLocalEnvironment) except where the app sets the variable itself (provider keys, agent tools).
const localEnvironment = require("./local-environment.cjs").createLocalEnvironment({ app,
  managedKeys: () => { let tools = {}; try { tools = agentTools.launchEnv() ?? {}; } catch { tools = {}; } return [...coreSecretEnvKeys(), ...Object.keys(tools)]; } });
require("./codex.cjs").setLocalEnvironment(() => localEnvironment.launchEnv());
// Settings › Cores: which agent core runs, and the official releases this app downloads (core-manager.cjs).
const coreManager = createCoreManager({ dataDir: () => app.getPath("userData"), getConfig: () => config, save: () => save(), emit, setCoreChoice, deepseekScript: deepseekCoreScript, bridgeScript, nodeBinary });
// Extension Packs (extension-packs.cjs): imported agent cores, registered with core-registry.mjs. A change re-points
// codex.cjs (coreManager.apply) and tells the renderer, which registers the same descriptors.
const extensionPacks = createExtensionPacks({ dataDir: () => app.getPath("userData"), getConfig: () => config, save: () => save(),
  onChange: () => { coreManager.apply(); emit({ kind: "extensions", cores: extensionPacks.descriptors() }); } });
const customCommands = createCustomCommands({ app, shell, dialog, getConfig: () => config, emit: (e) => emit(e), getWindow: () => win, knownCwd: (cwd) => workspaceQueryRoot(cwd) });
// Sidebar metadata snapshot returned by every sidebar-state mutation.
let taskBacklogStore = null;
const taskBacklog = () => (taskBacklogStore ??= createTaskBacklog({ dataDir: () => app.getPath("userData") }));
// R2-sections (sidebar-sections-store, D10): the Code sidebar's sections, loaded at startup.
let sidebarSectionsStore = null;
function sidebarSnapshot() {
  return { sessionMetadata: config.sessionMetadata, customGroups: config.customGroups, sidebarPreferences: config.sidebarPreferences,
    sidebarSections: sidebarSectionsStore ? sidebarSectionsStore.sidebarSectionsFor(config) : (Array.isArray(config.sidebarSections) ? config.sidebarSections : []),
    pinnedOrder: config.pinnedOrder || [], projectOrder: Array.isArray(config.projectOrder) ? config.projectOrder : [], revision: config.sidebarRevision,
    // Codex's built-in Pinned section (codex-sections.cjs): a thread Codex keeps there reads as pinned.
    codexPinnedSectionId: config.codexPinnedSectionId ?? null };
}
const codexSections = require("./codex-sections.cjs");
// A sidebar change mirrored into Codex's sections (best effort: the local store stays the source of truth here).
function mirrorSections(task) {
  const owner = client;
  if (!codexSections.sectionsCore(owner, { coreForEngine })) return;
  Promise.resolve().then(() => task(owner)).then(() => { try { save(); } catch {} }, (error) => console.warn(`codex sections: ${error?.message ?? error}`));
}
// OS launchers behind one seam so isolated GUI suites can intercept them the
// way they intercept shell.openPath; production always runs the real command.
const externalOpeners = { terminal: (cwd) => run("open", ["-a", "Terminal", "--", cwd], { timeout: 10000 }) };
globalThis.codeDesktopExternalOpeners = externalOpeners;
const allowed = new Set([
  // Codex goals (ThreadGoalSet/Get/ClearParams {threadId, …}): /goal and the goal strip, for a known session only.
  "thread/goal/get",
  "thread/goal/set",
  "thread/goal/clear",
  "thread/start",
  "thread/resume",
  "thread/read",
  "thread/list",
  "thread/name/set",
  "thread/archive",
  "thread/unarchive",
  // Protocol ThreadDeleteParams {threadId}: destructive, so the renderer must
  // confirm first and the guard below refuses running/pending sessions.
  "thread/delete",
  // ThreadUnsubscribeParams {threadId}: the renderer sends it only on the
  // DeepSeek core, for an idle session it left (session-unload-model.mjs), so
  // the Harness write lock is released; the core reopens it on next use.
  "thread/unsubscribe",
  "turn/start",
  // Codex 0.155.1 app-server queue/steer surface (probed against the binary
  // with an isolated CODEX_HOME): thread/queue/add requires clientUserMessageId,
  // delete/update take queuedSubmissionId, reorder takes queuedSubmissionIds,
  // list returns {data, nextCursor}; turn/steer needs expectedTurnId.
  "thread/queue/add",
  "thread/queue/list",
  "thread/queue/update",
  "thread/queue/delete",
  "thread/queue/reorder",
  "thread/queue/start",
  // Codex 0.155.1 paginated thread history: a paginated thread is resumed with
  // excludeTurns (ts/v2/ThreadResumeParams.ts:33-40) and hydrated through these
  // two read-only stable pagers (ts/ClientRequest.ts:108) instead of deprecated
  // full-history hydration.
  "thread/turns/list",
  "thread/items/list",
  "model/list",
  "account/read",
  "account/rateLimits/read",
  // ChatGPT workspace headlines (GetWorkspaceMessagesResponse; tui workspace_messages.rs): read-only.
  "account/workspaceMessages/read",
  // Codex /feedback (tui feedback_view.rs): category, note, and optionally this session's logs; params rebuilt below.
  "feedback/upload",
  // An ACP agent's own settings (Gemini / Qwen settings.json keys; acp-bridge codeDesktop/coreSettings/*).
  "codeDesktop/coreSettings/read",
  "codeDesktop/coreSettings/write",
  // MiMo imports other tools' sessions only when the user asks (Settings › Code › Import sessions).
  "codeDesktop/history/import",
  "account/usage/read",
  // Read-only: the Mode menu's Bypass row shows a managed refusal ('Disabled by your organization') before opt-in.
  "configRequirements/read",
  // Codex 0.155.1 ConsumeAccountRateLimitResetCreditParams {idempotencyKey, creditId?}: redeems one earned
  // usage-limit reset, only after the Usage page's confirmation; params are rebuilt below.
  "account/rateLimitResetCredit/consume",
  // SendAddCreditsNudgeEmailParams {creditType: credits|usage_limit}: a workspace member asks the owner for
  // credits or a higher limit (Codex tui chatwidget/rate_limits.rs), only from the Usage page's button.
  "account/sendAddCreditsNudgeEmail",
  // DeepSeek bridge extension (harness index.js, capabilities.livePermissions): a Mode change during a turn,
  // sent with the turn/start permission params; bypass is validated like turn/start below.
  "codeDesktop/thread/permissions",
  // DeepSeek bridge extension (capabilities.modelWorkflows): stop a run of the model's `workflow` tool.
  "codeDesktop/workflow/stop",
  "codeDesktop/workflow/member",
  // A model run's pause (Qwen's workflow-action) and a settled run's resume (ZCode's resumeWorkflowRun).
  "codeDesktop/workflow/pause",
  "codeDesktop/workflow/resume",
  // A run's published deliverable, read from the core's store (ZCode's artifact.*: capabilities.workflowArtifacts).
  "codeDesktop/workflow/artifact",
  // A running run's sub-agent model and agent limit (ZCode's run card Configure: capabilities.workflowRunSettings).
  "codeDesktop/workflow/settings",
  // DeepSeek bridge extension: the /btw side chat (side-question.js), read-only, plus its cancel.
  "codeDesktop/sideQuestion",
  "codeDesktop/sideQuestion/cancel",
  // Automatic session title on a native core (capabilities.titleRequest: Codex's hidden structured title turn,
  // native-thread-title.cjs) for a known session; answered here, never forwarded.
  "codeDesktop/threadTitle",
  // Bridge extension (capabilities.legacyMigration: Kimi Code's `kimi migrate`): what an older install left behind, and
  // bringing it over after the user chose to in Settings › Cores (params rebuilt below).
  "codeDesktop/migration/read",
  "codeDesktop/migration/run",
  // Bridge extension (capabilities.continueTurn: Qwen's session continue): Try again resumes the failed turn of a known
  // session the agent's own way.
  "codeDesktop/turn/continue",
  // Bridge extension (capabilities.threadShare: OpenCode /share, /unshare): a known session's public share link, after the
  // renderer's confirmation.
  "codeDesktop/thread/share",
  // Bridge extension (capabilities.moveCwd: OpenCode's /move): /cd moves a known session to another folder of its project.
  "codeDesktop/thread/move",
  // Codex Remote Control (remoteControl/*, `codex remote-control`): status, switching it on or off, pairing a device and
  // the paired devices, from Settings › Code › Remote control on a native core (params rebuilt below).
  "remoteControl/status/read",
  "remoteControl/enable",
  "remoteControl/disable",
  "remoteControl/pairing/start",
  "remoteControl/pairing/status",
  "remoteControl/client/list",
  "remoteControl/client/revoke",
  // DeepSeek bridge extension (capabilities.messageFeedback, dsh-message-feedback): Good / Bad response on replies,
  // listed when a session opens and set or cleared from a reply's buttons; params rebuilt in message-feedback.cjs.
  "codeDesktop/messageFeedback/list",
  "codeDesktop/messageFeedback/put",
  "codeDesktop/messageFeedback/delete",
  // Core extension (capabilities.coreCommands): the running core's own slash commands (/goal …), listed for the
  // open session or folder and run against a known session; the renderer only sends them when the core reports it.
  "codeDesktop/commands/list",
  // OpenCode `references` for the @ menu (opencode-bridge codeDesktop/references/list).
  "codeDesktop/references/list",
  // What the agent's own @ names besides files (acp-bridge codeDesktop/mentions/list: Qwen's @mcp: / @ext:), read-only.
  "codeDesktop/mentions/list",
  // DeepSeek's own settings (codex-app-server core-settings.js: shell timeout and output, parallel tool calls, sub-agent
  // limits, web search): read, and one listed field written or reset at a time (params rebuilt below).
  "codeDesktop/settings/read",
  "codeDesktop/settings/write",
  "codeDesktop/commands/execute",
  // Codex '!' shell mode (ThreadShellCommandParams {threadId, command}; tui RunUserShellCommand): the user's own command,
  // run unsandboxed like Codex's own `!`, for a known session (params rebuilt below).
  "thread/shellCommand",
  // Codex /auto-review (ThreadApproveGuardianDeniedActionParams {threadId, event}): one retry of a denied action, for a
  // known session, after the renderer's confirmation (params rebuilt below).
  "thread/approveGuardianDeniedAction",
]);
// Deprecated in 0.155.1 and deliberately unreachable from the renderer:
// thread/rollback (thread_processor.rs:810-826, replaced by thread/revert)
// and review/start delivery "detached" (turn_processor.rs:343-352). The
// allowlist already omits them; this records the refusal reason and keeps a
// later edit from re-adding one by accident.
const deprecated = new Map([
  ["thread/rollback", "thread/rollback is deprecated in Codex 0.155.1; thread/revert replaces it."],
]);
// Composer attachment staging: pasted clipboard images must become real files
// so turn/start can carry {type:"localImage",path}. They live under userData.
const IMAGE_TYPES = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/gif", "gif"], ["image/webp", "webp"]]);
const IMAGE_MAX_BYTES = 31457280;
const MIME_BY_EXTENSION = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
function stagingDirectory() {
  return path.join(app.getPath("userData"), "attachments");
}
// Read-only facts for user-chosen files (dialog or Finder drop): the path must
// be absolute and a regular file; nothing is read beyond stat.
async function inspectAttachments(paths) {
  if (!Array.isArray(paths) || paths.length > 64) throw new Error("Choose at most 64 files.");
  const out = [];
  for (const candidate of paths) {
    if (typeof candidate !== "string" || !path.isAbsolute(candidate) || candidate.includes("\0")) continue;
    let stat;
    try { stat = await fs.promises.stat(candidate); } catch { continue; }
    if (!stat.isFile()) continue;
    const name = path.basename(candidate);
    const extension = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
    out.push({ path: candidate, name, size: stat.size, type: MIME_BY_EXTENSION[extension] || "" });
  }
  return out;
}
async function stageAttachment(payload) {
  const type = typeof payload?.type === "string" ? payload.type.toLowerCase() : "";
  const extension = IMAGE_TYPES.get(type);
  if (!extension) throw new Error("Only PNG, JPEG, GIF, and WebP images are supported.");
  const bytes = payload?.bytes;
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new Error("Failed to process image. You can try again.");
  if (bytes.length > IMAGE_MAX_BYTES) throw new Error("Some images were too large to attach. Maximum size is 30 MB.");
  const directory = stagingDirectory();
  await fs.promises.mkdir(directory, { recursive: true });
  const stem = typeof payload.name === "string" && payload.name ? payload.name.replace(/[^\w.-]+/g, "_").slice(0, 64) : "image";
  const target = path.join(directory, `${Date.now().toString(36)}-${require("node:crypto").randomUUID().slice(0, 8)}-${stem.replace(/\.[^.]*$/, "")}.${extension}`);
  await fs.promises.writeFile(target, bytes, { flag: "wx" });
  return { path: target, name: path.basename(target), size: bytes.length, type };
}
// View > Hide/Show Sidebar label follows the persisted state (index.chunk-ChZ67Jhw.js _Nr/gNr).
// Go > Back/Forward enabled state (index.chunk-D6ATlqeD.js xyr/Syr), reported
// by the renderer's history and carried into every template rebuild.
let navState = navigationState();
// View pane items, Close Pane, File's ⌘W label (Close Session / Close Pane /
// Close Window) and Reopen Closed Session follow the renderer's "menu-state"
// report (the source's BZ.sessionPanes and BZ.reopenClosedSession, sent like
// navigation-state); app-menu.cjs menuState normalizes every key.
let paneMenuState = menuState();
// View › Split View follows the focused window's "split-menu-state" report (official reportSplitViewMenuState).
let splitMenu = splitMenuState();
function installAppMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(appMenuTemplate({ sidebarOpen: config?.sidebarCollapsed !== true, ...navState, zoomed: mainZoomLevel() !== 0,
    // R4e-zoom: yPi's enabled:_Pi() / vPi() read the main view's level (gPi: void 0 without one).
    zoomLevel: menuZoomLevel(win, liveContents),
    fullScreen: liveContents(win) && win.isFullScreen(), allowDevTools: !app.isPackaged, menuState: paneMenuState, splitState: splitMenu,
    newWindow: windowRegistry.sessionPopouts().length < MAX_SESSION_POPOUTS, emit: menuEmit })));
}
// Each main window reports its own Go / pane / split state; the menu bar shows the focused window's (window kept
// in windowRegistry, adopted on focus). A report from a background window is kept for when it is focused.
const reportFromOtherWindow = (window) => !!window && liveContents(win) && window !== win;
function setMenuState(payload, window) {
  const next = menuState(payload);
  if (window) windowRegistry.setState(window, "menu", next);
  if (reportFromOtherWindow(window)) return next;
  if (sameMenuState(next, paneMenuState)) return paneMenuState;
  paneMenuState = next;
  installAppMenu();
  return paneMenuState;
}
function setSplitMenuState(payload, window) {
  // B27 (c2189a16b popout_has_no_panes): a session popout has no split view, so View › Split View stays disabled there.
  const next = splitMenuState(windowRegistry.isSessionPopout(window) ? null : payload);
  if (window) windowRegistry.setState(window, "split", next);
  if (reportFromOtherWindow(window) || JSON.stringify(next) === JSON.stringify(splitMenu)) return next;
  splitMenu = next;
  installAppMenu();
  return next;
}
// A main window took the focus: it becomes `win` and the menu bar shows its reports.
function adoptMainWindow(window) {
  windowRegistry.noteFocus(window);
  if (win === window) return;
  win = window;
  navState = windowRegistry.getState(window, "nav") ?? navigationState();
  paneMenuState = windowRegistry.getState(window, "menu") ?? menuState();
  splitMenu = windowRegistry.getState(window, "split") ?? splitMenuState();
  installAppMenu();
}
// Zxr: a menu command aimed at the renderer first brings back a main window
// the user closed (hidden) or minimized, and focuses it when another window
// (a pane window) was the menu's target.
function revealMainWindow(target) {
  // The menu's own main window, else (a pane window or none was the target) the main window focused last.
  const window = windowRegistry.isMain(target) ? target : win;
  if (!liveContents(window)) return null;
  if (window.isMinimized()) window.restore();
  else if (windowRegistry.getState(window, "hidden") === true) window.show();
  if (target && target !== window && !target.isDestroyed()) window.focus();
  return window;
}
// KK (Window > Show Main Window, the Dock and the tray's Show App): show the
// main window, recreating it when it no longer exists.
function showMainWindow() {
  // B27: a session popout is never "the main window"; the full window focused last is.
  const full = windowRegistry.lastFocusedFull();
  if (liveContents(full)) showWindow(full);
  else if (liveContents(win) && !windowRegistry.isSessionPopout(win)) showWindow(win);
  else if (!quitting && desktopReady) openMainWindow().catch(() => {});
}
// Help > Troubleshooting > Show Logs in Finder (Ejr): the app's logs folder.
async function showLogs() {
  const logs = app.getPath("logs");
  await fs.promises.mkdir(logs, { recursive: true });
  const error = await shell.openPath(logs);
  if (error) throw new Error(error);
}
// View > Actual Size / Zoom In / Zoom Out arrive as {kind:"zoom"}; Window >
// Show Main Window, Help > Show Logs and View > Enter/Exit Full Screen (xNr:
// the focused window) are main-process actions. A Close Pane aimed at a pane
// window closes (docks) that window, like owr's performClose for a non-main
// window. Every other menu event goes to the renderer.
function menuEmit(e, target) {
  if (e?.kind === "zoom") return applyZoom(e);
  if (e?.kind === "show-main-window") return showMainWindow();
  if (e?.kind === "show-logs") return void showLogs().catch(() => {});
  if (e?.kind === "toggle-full-screen") {
    const window = target && !target.isDestroyed() ? target : BrowserWindow.getFocusedWindow();
    if (window && window.isFullScreenable()) window.setFullScreen(!window.isFullScreen());
    return;
  }
  // File › New Window (cd377abb5 si → shared-11 Zo openPopout {type: "code-draft"}): a sidebar-less new-session popout
  // that becomes that session's popout on its first send. Disabled at MAX_SESSION_POPOUTS (installAppMenu); a refusal
  // that still gets here (a race) is logged, not lost.
  if (e?.kind === "new-window") return void openSessionPopout({ from: windowRegistry.isMain(target) ? target : win }).catch((error) => console.warn("[window] New Window:", error?.message ?? error));
  if ((e?.kind === "close-pane" || e?.kind === "close-session") && target && (!windowRegistry.isMain(target) || windowRegistry.isPaneWindow(target)) && !target.isDestroyed()) return target.close();
  // owr: in the main window the renderer's keydown owns ⌘W (pR); one that still reached File > Close
  // Session through the accelerator was declined there (a menu or dialog is open), so it is not re-sent.
  if (e?.kind === "close-session" && e.accelerator) return;
  // Menus act on the focused window only (its renderer routes the command to its focused split side).
  // A pane window (B27) shows one pane: the session's other commands go to the main window.
  const window = revealMainWindow(windowRegistry.isPaneWindow(target) ? null : target);
  if (window) windowRegistry.send(window, e);
}
// Pane windows keep their own traffic-light origin, scaled like the main one
// (index.chunk-ChZ67Jhw.js sun/cun: run(base, zoomFactor) per window).
const POPOUT_TRAFFIC_LIGHTS = Object.freeze({ x: 14, y: 12 });
const liveContents = (window) => window && !window.isDestroyed() && !window.webContents.isDestroyed();
const mainZoomLevel = () => liveContents(win) ? win.webContents.getZoomLevel() : 0;
const zoomFactorOf = (window) => clampZoomFactor(liveContents(window) ? window.webContents.getZoomFactor() : 1);
function placeTrafficLights(window) {
  if (!liveContents(window) || typeof window.setWindowButtonPosition !== "function") return;
  const factor = zoomFactorOf(window);
  window.setWindowButtonPosition(windowRegistry.isMain(window) && !windowRegistry.isPaneWindow(window) ? trafficLightPosition(factor) : scaleTrafficLights(POPOUT_TRAFFIC_LIGHTS, factor));
}
// ONr/SNr: step (lNr .5) or reset the main window's level; CNr copies it to
// every window and repositions each window's lights (cun); DNr keeps Actual
// Size enabled only while zoomed (2.42304.0 PPi: and Zoom In / Zoom Out only
// inside the level range); aF moves the main lights and dispatches the
// factor to the renderer (dispatchZoomFactorChanged), whose traffic-light
// spacer follows it.
function applyZoom(request) {
  applyWindowZoom({
    win,
    windows: [...windowRegistry.mainWindows(), ...[...popouts.values()].map((entry) => entry.window)],
    request,
    isLive: liveContents,
    placeTrafficLights,
    zoomSettled,
  });
}
function zoomSettled() {
  // R4e-zoom: 2.42304.0 I$ → PPi sets actual-size / actual-size-numpad / zoom-in / zoom-out in one pass.
  settleWindowZoom({ win, Menu, isLive: liveContents, zoomFactorOf, rememberZoomHint, emit });
}
// qI pBn.remember (index.chunk-CiiI592G.js, 2.31226.0): once the main page has loaded, its settled zoom factor is
// kept (preferences.json windowControlsZoomFactor) for the next launch's first frame and traffic lights.
function rememberZoomHint(factor) {
  if (!config || !configPath || !liveContents(win) || win.webContents.isLoading() || config[ZOOM_HINT_KEY] === factor) return;
  const previous = config[ZOOM_HINT_KEY];
  config[ZOOM_HINT_KEY] = factor;
  try { save(); } catch { config[ZOOM_HINT_KEY] = previous; }
}
// mBn(): the remembered factor (1 without one), clamped like every zoom factor.
const zoomHint = () => zoomFactorHint(config?.[ZOOM_HINT_KEY]);
// Ctrl+wheel only requests a zoom ("zoom-changed" does not change the level
// itself, and the source registers no handler); re-sync the chrome so the
// lights always match whatever level the contents report.
function watchZoom(window) {
  window.webContents.on("zoom-changed", () => setImmediate(() => {
    placeTrafficLights(window);
    if (windowRegistry.isMain(window)) zoomSettled();
  }));
}
// Preload's synchronous first-paint appearance: the saved preference and the
// resolved mode, so the renderer never starts from a light frame. Windows are
// created only after preferences.mjs has loaded and set themePreference.
let themePreference = null;
// The UI language (electron/i18n), set from preferences.json once it is read.
let i18n = null;
ipcMain.on("desktop:appearance", (e) => {
  const theme = themePreference ? themePreference(config?.theme) : "system";
  // preferredLanguages: the source's desktopPreferredLanguages (ZK preferredSystemLanguages: JDr over
  // app.getPreferredSystemLanguages()), read by the renderer's html[data-cjk-order] (src/cjk-order.mjs).
  e.returnValue = { theme, mode: nativeTheme.shouldUseDarkColors ? "dark" : "light", locale: i18n ? i18n.localePreference(config?.locale) : "en-US", assistant: chosenAssistant(),
    preferredLanguages: preferredSystemLanguages(app.getPreferredSystemLanguages()) };
});
function setNavigationState(payload, window) {
  const next = navigationState(payload);
  if (window) windowRegistry.setState(window, "nav", next);
  if (reportFromOtherWindow(window)) return next;
  navState = next;
  const menu = Menu.getApplicationMenu();
  const back = menu?.getMenuItemById("go-back"), forward = menu?.getMenuItemById("go-forward");
  if (back) back.enabled = navState.canGoBack;
  if (forward) forward.enabled = navState.canGoForward;
  return navState;
}
function emit(e) {
  if(e.kind==='workflow'){desktopSettings?.observe(e);liveWork.observe(e);}
  // Every main window (windowRegistry.dispatch: session and app events everywhere, desktop-navigate to the window
  // showing that session, window-scoped events to their window); a notification's window comes to the front.
  const sent = windowRegistry.dispatch(e);
  if (e.kind === "desktop-navigate") for (const window of sent) showWindow(window);
}
// Session list changes made through one window reach the others (and the other split side), which add, rename,
// archive or drop the row in their own lists (main.jsx "session-list").
// Settings saved in one window reach the others and the other split side (appearance, language, sidebar width):
// the config without the per-session ledgers, which no window reads from this event (main.jsx "config-updated").
function sharedConfig() {
  const { activity, stats, threadMetadata, codeStats, sessionMetadata, ...shared } = config || {};
  void activity; void stats; void threadMetadata; void codeStats; void sessionMetadata;
  return shared;
}
function emitConfig() {
  const shared = sharedConfig();
  emit({ kind: "config-updated", config: shared });
  // Pane windows are not main windows (windowRegistry.dispatch skips them): they take the appearance the same way, so a
  // popped-out pane follows fonts, code themes, Reduce motion and the custom theme (cd377abb5 Yn mirroring).
  for (const entry of popouts.values()) {
    if (entry.window.isDestroyed() || entry.window.webContents.isDestroyed()) continue;
    entry.window.webContents.send("desktop:event", { kind: "config-updated", config: shared });
  }
}
function emitSessionList(op, value) {
  if (op === "added" || op === "updated") {
    if (!value?.id) return;
    const { turns, ...thread } = value;
    void turns;
    emit({ kind: "session-list", op, thread });
  } else if (typeof value === "string") emit({ kind: "session-list", op, threadId: value });
}
// Files named by the core's configWarning notifications (config.toml, a rules file): the only paths the notice
// banner's 'Show in Finder' may reveal (reveal-config-file).
const configWarningPaths = new Set();
// Saved workflow files the last 'saved-workflows' listing named: the only ones 'saved-workflow-reveal' shows in Finder.
const knownSavedWorkflowPaths = new Set();
// Connection-wide notices (configWarning, deprecationNotice, a warning without a thread) of the live connection:
// Codex sends them at initialize, often before the window listens, so init/reconnect hand them to the renderer too.
let connectionNotices = [];
// /btw on a native core (native-side-chat.cjs): Codex's own ephemeral side-conversation fork.
// The fork's OpenClaude Desktop server works for the parent session with that session's own credential (so it can name no
// other), and offers only the tools that read the session's terminal and preview: a side question never runs a
// command, opens a card in the main thread or changes the session (Codex /side: non-mutating inspection only).
// A review (Codex review/start) reads too: the side chat's tools, plus the session list and ReportFindings.
const REVIEW_APP_TOOLS = new Set(["list_terminal_tabs", "read_terminal", "preview_list", "preview_logs", "screenshot", "read_page", "get_page_text", "preview_inspect", "find", "read_console_messages", "read_network_requests", "CronList", "ReportFindings", "list_sessions", "get_session", "list_events", "load_tools"]);
const SIDE_CHAT_APP_TOOLS = ["list_terminal_tabs", "read_terminal", "preview_list", "preview_logs", "screenshot", "read_page", "get_page_text", "preview_inspect", "find", "read_console_messages", "read_network_requests", "CronList"];
const nativeSideChat = createNativeSideChat({ getClient: () => client, emit: (event) => emit(event), customPrompt: () => instructionsService.customPromptActive(),
  settings: () => ({ model: config?.model ?? null, effort: config?.effort ?? null }),
  decorateFork: (params, parentId, owner) => {
    if (!agentTools.socketPath || coreForEngine(owner?.serverInfo?.engine).kind !== "native" || !coreTakesAgentTools(owner)) return params;
    return { ...params, config: { ...(params.config ?? {}), [AGENT_SESSION_KEY]: parentId, [AGENT_TOKEN_KEY]: agentTools.sessionToken(parentId),
      [`mcp_servers.${agentTools.SERVER_NAME}.enabled_tools`]: SIDE_CHAT_APP_TOOLS } };
  } });
// Codex's automatic session titles (native-thread-title.cjs): a hidden ephemeral thread per title, every MCP server
// off (OpenClaude Desktop's own too: the launch flag adds it).
const nativeThreadTitles = createNativeThreadTitles({ getClient: () => client,
  ownServers: (owner) => agentTools.socketPath && coreForEngine(owner?.serverInfo?.engine).kind === "native" && coreTakesAgentTools(owner) ? [agentTools.SERVER_NAME] : [],
  context: () => ({ chatgpt: accountOperations?.accountSnapshot?.()?.account?.type === "chatgpt", models: initial?.models || [], model: config?.model ?? null }) });
// A native core without the codeDesktop/sideQuestion extension (Codex): the side chat runs as Codex's /side fork.
const nativeSideQuestions = () => coreForEngine(client?.serverInfo?.engine).kind === "native" && client?.serverInfo?.capabilities?.sideQuestion !== true;
// Codex's Claude Code import (externalAgentConfig/import): the call waiting for its import/completed notification.
const pendingImports = new Map(), finishedImports = new Map();
// The placeholder some cores put in a code_desktop tool item instead of the image the tool returned (ZCode, Qwen,
// Gemini; DeepSeek on a text-only model, which drops the picture for the model: "[image unavailable: image/png; model
// … does not declare image input; …]"): the item gets the picture back from the agent-tools host, so the row shows the
// screenshot the agent took as on Codex.
const IMAGE_PLACEHOLDER = /^\s*\[(?:Attached image\/[\w.+-]+: [^\]\n]*|Image: image\/[\w.+-]+|Tool '[^'\n]*' provided the following image data with mime-type: image\/[\w.+-]+|image unavailable: image\/[\w.+-]+;[^\]\n]*)\]\s*$/gm;
function withAppToolImages(e) {
  const item = e?.method === "item/completed" ? e.params?.item : null;
  if (!item || item.type !== "mcpToolCall" || item.server !== agentTools.SERVER_NAME || typeof e.params.threadId !== "string") return e;
  const content = Array.isArray(item.result?.content) ? item.result.content : [];
  if (content.some((part) => part?.type === "image") || !content.some((part) => part?.type === "text" && typeof part.text === "string" && new RegExp(IMAGE_PLACEHOLDER.source, "m").test(part.text))) return e;
  const images = agentTools.recentImages(e.params.threadId, item.tool);
  if (!images) return e;
  const text = content.map((part) => part?.type === "text" && typeof part.text === "string" ? { ...part, text: part.text.replace(IMAGE_PLACEHOLDER, "").trim() } : part).filter((part) => !(part?.type === "text" && !part.text));
  return { ...e, params: { ...e.params, item: { ...item, result: { ...item.result, content: [...text, ...images] } } } };
}
let artifactIndex, artifactRead;
const artifactIndexed = new WeakMap();
function receive(e) {
  e = withAppToolImages(e);
  // R4g-routines RT6: a Code task run's command approval its task's rule covers is answered (accept, this call) before any card.
  if (routineApprovals?.receive(e, client, respondToApproval)) return;
  // A side-chat fork's events stay in main: the panel gets its deltas, the sidebar never sees the fork.
  if (nativeSideChat.observe(e)) return;
  if (nativeThreadTitles.observe(e)) return;
  if (e.method === "externalAgentConfig/import/completed" && typeof e.params?.importId === "string") {
    // Kept briefly too: the notification can arrive before the import call's own response.
    if (pendingImports.has(e.params.importId)) pendingImports.get(e.params.importId)(e.params);
    else { finishedImports.set(e.params.importId, e.params); setTimeout(() => finishedImports.delete(e.params.importId), 60000).unref?.(); }
  }
  if (e.kind === "connection" && !e.connected) { connectionNotices = []; activeGoals.clear(); }
  if ((e.method === "configWarning" || e.method === "deprecationNotice" || (e.method === "warning" && !e.params?.threadId)) && connectionNotices.length < 50)
    connectionNotices.push({ method: e.method, params: e.params });
  if (e.method === "configWarning" && typeof e.params?.path === "string" && path.isAbsolute(e.params.path) && !e.params.path.includes("\0") && configWarningPaths.size < 200)
    configWarningPaths.add(e.params.path);
  sessionOperations.observe(e);
  btwSessions.observe(e);
  if (e.method === 'item/completed' && artifactIndex?.recordArtifactItem(config, e.params?.threadId, e.params?.item)) save();
  liveWork.observe(e);
  observeGoal(e);
  observeUsage(e);
  workflowToolService?.observe(e);
  turnPlanTools?.observe(e, { isSession: (id) => config.threadIds.includes(id) }).catch?.(() => {}); // turn-plan
  localRoutines?.observe(e);
  // A turn that ended, however it ended, cancels the OpenClaude Desktop tool calls it left waiting (Codex tells its MCP
  // servers neither about a stop nor about its own tool_timeout_sec giving up on a call): their approval cards close,
  // and Allow / Run can no longer start anything for a turn that is over and was told the call failed. Only the calls
  // of the thread whose turn it was: a Codex sub-agent (spawn_agent) names its own thread on its calls, and its own
  // turn's end cancels them (agent-tools-host.cjs cancelThread), not the parent's.
  // A core whose agents keep background sub-agents or workflow agents working after the turn ends (DeepSeek, Kimi,
  // Qwen, OpenCode, …: coreKeepsBackgroundAgents) makes their calls as the session itself, still live: there only a
  // stopped turn cancels (the agent cancels an abandoned call itself, over MCP).
  if (e.method === "turn/completed" && typeof e.params?.threadId === "string") {
    const interrupted = e.params.turn?.status === "interrupted";
    if (interrupted) agentTools.cancelThread(e.params.threadId, "The turn was stopped.");
    else if (!coreKeepsBackgroundAgents()) agentTools.cancelThread(e.params.threadId, "The turn ended.");
  }
  accountOperations.observe(e);
  desktopSettings?.observe(e);
  const p = e.params || {};
  const id = p.threadId;
  if (recordActivity(config, e)) save();
  // B29: a session whose turn failed is 'Needs input' on Home until acknowledged (session-attention.cjs).
  if (typeof id === "string" && config.threadIds.includes(id)) {
    const marked = sessionErrorPatch(config.sessionMetadata[id], e);
    if (marked) {
      config.sessionMetadata[id] = marked;
      config.sidebarRevision = (config.sidebarRevision || 0) + 1;
      save();
      emit({ kind: "sidebar-state", state: sidebarSnapshot() });
    }
  }
  if (id && config.threadIds.includes(id) && e.method === "turn/completed") pushCodeStats();
  // A card hidden by a failed read comes back once the core is reachable again.
  if (e.kind === "connection" && e.connected && statsFailed) pushCodeStats();
  emit(e);
}
// Home stats card (cc43287c9-BMbiZYzF.js:3987-4004 $O getCodeStats; code-home.js:13711-13751
// Iw ranges it). A core listing capabilities.codeStats (the DeepSeek bridge) folds every
// session it can read (codeDesktop/stats/read); its last result stays in config.codeStats so
// the card paints at once on the next launch. Any other core (Codex) gets this client's own
// ledger (activity.cjs ledgerStats). Concurrent reads share one request.
let statsRead = null, statsFailed = false;
function readCodeStats() {
  statsRead ??= (async () => {
    const owner = client;
    // F09 review: the kept result is tagged with its core (activity.cjs keptCodeStats).
    const coreKey = statsCoreKey(resolveCore());
    let core = initial?.core;
    if (!core) {
      // Only initialize is needed to know the core, not the whole connect (model/list).
      try { await owner.start(); core = coreInfo(owner); }
      catch (error) { if (resolveCore().prefix?.length) throw error; }
    }
    if (core?.capabilities?.codeStats === true) {
      const stats = await owner.request("codeDesktop/stats/read", {});
      if (!statsShape(stats)) throw new Error("The usage stats could not be read.");
      if (JSON.stringify(stats) !== JSON.stringify(config.codeStats) || config.codeStatsCore !== coreKey) { config.codeStats = stats; config.codeStatsCore = coreKey; save(); }
      return stats;
    }
    if (!readableLedger(config.activity)) throw new Error("The usage ledger could not be read.");
    return ledgerStats(config.activity);
  })().then((stats) => { statsFailed = false; return stats; }, (error) => { statsFailed = true; throw error; })
    .finally(() => { statsRead = null; });
  return statsRead;
}
// The 'stats' push event: a turn that ends during a read is folded by the next one.
function pushCodeStats() {
  const pending = statsRead ? statsRead.catch(() => {}) : Promise.resolve();
  pending.then(readCodeStats).then((stats) => emit({ kind: "stats", stats }), () => {});
}
function save() {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath + ".tmp", JSON.stringify(config, null, 2));
  fs.renameSync(configPath + ".tmp", configPath);
}
// boot.core: initialize's engine report. A Codex app-server (and the UI
// fixtures) reports none, so everything keyed on the core defaults to Codex; a
// native Extension Pack that reports none is named by the core it spawned
// (codex.cjs reportedServerInfo), never Codex.
function coreInfo(owner) {
  const info = owner.serverInfo, descriptor = coreForEngine(info?.engine);
  // id/name: the core-registry.mjs descriptor (capabilities stay as reported; coreSupports adds the implied ones).
  // A per-token account bills per token whatever the core (a Codex API key): the Usage copy says so (usage-model.mjs).
  const account = owner === client ? accountOperations.accountSnapshot() : null;
  const capabilities = { ...(info?.capabilities ?? {}), ...(perTokenAccount(account) ? { perTokenBilling: true } : {}),
    btwChildSessions: supportsBtwChildren(owner),
    ...(supportsBtwChildren(owner) ? { reorderQueued: true } : {}),
    ...(owner.connection?.enabledFeatures?.has("guardian_approval") ? { autoReview: true } : {}),
    // Goals: Codex's feature flag, or a bridge that serves the agent's own goals (capabilities.goals: Qwen's /goal).
    ...(owner.connection?.enabledFeatures?.has("goals") || info?.capabilities?.goals === true ? { nativeGoals: true } : {}) };
  // Codex reports no engineVersion: its initialize userAgent ("<client>/0.155.1 (Mac OS …)") carries the version.
  const agentVersion = typeof info?.userAgent === "string" ? /\/(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/.exec(info.userAgent)?.[1] ?? null : null;
  return { id: descriptor.id, name: descriptor.name, engine: info?.engine ?? "codex", engineVersion: info?.engineVersion ?? agentVersion, capabilities, configPath: info?.configPath ?? null,
    ...(typeof info?.mcpConfigPath === "string" && info.mcpConfigPath ? { mcpConfigPath: info.mcpConfigPath } : {}),
    // Where a core with a movable home really runs (Codex's codexHome under CODEX_HOME): its paths are shown there (corePath).
    ...(descriptor.home && typeof info?.codexHome === "string" && info.codexHome ? { home: info.codexHome } : {}) };
}
// Whether a connection's core has the Codex protocol's collaboration modes (turn/start collaborationMode): a core
// that declares capabilities.collaborationModes, never one with permission hints (its mode travels as the hint),
// else asked once per connection (collaborationMode/list lists a "plan" preset; any failure is no).
function collaborationModes(owner) {
  const info = owner?.serverInfo, connection = owner?.connection;
  if (!info || !connection) return Promise.resolve(false);
  if (coreSupports(info, "collaborationModes")) return Promise.resolve(true);
  if (coreSupports(info, "permissionHints")) return Promise.resolve(false);
  connection.collaborationModes ??= owner.request("collaborationMode/list", {}, 10000, connection)
    .then((result) => Array.isArray(result?.data) && result.data.some((preset) => preset?.mode === "plan"), () => false);
  return connection.collaborationModes;
}
// The Plan mode reasoning effort of a core with collaboration modes (Codex): the user's plan_mode_reasoning_effort
// (config/read, the TUI's 'Always use X reasoning in Plan mode'), else the Plan preset's reasoning_effort from
// collaborationMode/list (asked once per connection; medium in 0.155.1). undefined when neither answers.
async function planModeEffort(owner, cwd) {
  const connection = owner?.connection;
  if (!connection) return undefined;
  const configured = await owner.request("config/read", { includeLayers: false, ...(cwd ? { cwd } : {}) }, 5000, connection)
    .then((result) => result?.config?.plan_mode_reasoning_effort, () => undefined);
  if (typeof configured === "string" && configured) return configured;
  connection.planPresetEffort ??= owner.request("collaborationMode/list", {}, 10000, connection)
    .then((result) => { const preset = (Array.isArray(result?.data) ? result.data : []).find((entry) => entry?.mode === "plan"); return preset ? preset.reasoning_effort ?? null : undefined; }, () => undefined);
  return connection.planPresetEffort;
}
// Codex's 'Approve for me' (approvalsReviewer auto_review; TUI /permissions): available where the core lists the
// guardian_approval feature as enabled (experimentalFeature/list, stable and on in 0.155.1). Asked once per connection
// on a core without permission hints; any failure is no. The answer lands in boot.core.capabilities.autoReview.
// The same list says whether Codex's goals (thread/goal/*, /goal) are on: boot.core.capabilities.nativeGoals.
function coreFeatures(owner) {
  const info = owner?.serverInfo, connection = owner?.connection;
  if (!info || !connection || coreSupports(info, "permissionHints")) return Promise.resolve(new Set());
  connection.features ??= owner.request("experimentalFeature/list", { limit: 200 }, 10000, connection)
    .then((result) => {
      const features = (Array.isArray(result?.data) ? result.data : []).filter((feature) => typeof feature?.name === "string");
      // Every flag this Codex knows, with its stage (defaultModeQuestions reads it when a thread starts).
      connection.featureStages = new Map(features.map((feature) => [feature.name, { stage: feature.stage, enabled: feature.enabled === true }]));
      return new Set(features.filter((feature) => feature.enabled === true).map((feature) => feature.name));
    }, () => new Set())
    .then((enabled) => { connection.enabledFeatures = enabled; return enabled; });
  return connection.features;
}
// …and only where the core's requirements allow that reviewer (ConfigRequirements.allowedApprovalsReviewers).
function autoReviewFeature(owner) {
  const connection = owner?.connection;
  if (!connection) return Promise.resolve(false);
  connection.autoReviewAllowed ??= owner.request("configRequirements/read", {}, 10000, connection)
    .then((result) => { const allowed = result?.requirements?.allowedApprovalsReviewers; return !Array.isArray(allowed) || allowed.includes("auto_review"); }, () => true);
  return Promise.all([coreFeatures(owner), connection.autoReviewAllowed]).then(([features, allowed]) => features.has("guardian_approval") && allowed);
}
// A (re)connected status carries boot.core for the renderer's connection handler, and the assistant name the copy
// uses now (the chosen core's, as the first-paint appearance answers): a window whose copy names another reloads.
function connectionEvent(owner, status) {
  return { kind: "connection", ...status, ...(status.connected ? { core: coreInfo(owner), assistant: chosenAssistant() } : {}) };
}
async function connect() {
  const owner = client;
  if (connecting?.owner === owner) return connecting.promise;
  const attempt = { owner, promise: null };
  attempt.promise = (async () => {
    const coreModel = await import("./prefs/core-model.mjs");
    // The API connection's env (and relay forwarder port) is in place before the core spawns.
    await modelSettings.ready?.();
    await owner.start();
    const [account, models] = await Promise.allSettled([
      accountOperations.refresh(owner),
      owner.request("model/list", { limit: 100 }),
      autoReviewFeature(owner),
    ]);
    if (owner !== client) throw coreError(owner, "The {core} connection changed. Reconnect to continue.");
    initial = {
      connected: true,
      core: coreInfo(owner),
      account: accountOperations.accountSnapshot(),
      models: models.status === "fulfilled" ? models.value.data : [],
      warnings: [account, models]
        .filter((x) => x.status === "rejected")
        .map((x) => x.reason.message),
    };
    // A Codex custom endpoint launched without its catalog (`debug models` failed): model/list lists the bundled
    // OpenAI models, which the endpoint doesn't serve, so the list (and the reconcile below) is its own ids.
    const custom = initial.core.id === "codex" ? modelSettings.codexCustomModels?.() : null;
    if (custom?.ids.length) initial.models = coreModel.customCatalogModels(custom.ids, initial.models, { template: custom.template });
    // Codex otherwise runs the model and provider of the user's own config.toml (a relay, Azure, Ollama…), which
    // model/list never lists: it is merged in as the default, so the reconcile below keeps it (config/read).
    let configured = null;
    if (initial.core.id === "codex" && !custom?.ids.length) {
      const codexConfig = await owner.request("config/read", { includeLayers: false, cwd: config.cwd || null }, 10000).then((result) => result?.config, () => null);
      if (owner !== client) throw coreError(owner, "The {core} connection changed. Reconnect to continue.");
      const { CODEX_PROVIDER_ID } = await import("./prefs/codex-provider.mjs");
      configured = coreModel.configuredCatalogModels(initial.models, codexConfig, { appProvider: CODEX_PROVIDER_ID, label: i18n ? i18n.t("Set in your Codex config.toml") : "Set in your Codex config.toml" });
      if (configured) initial.models = configured;
    }
    // The saved default model follows the running core (prefs/core-model.mjs): its remembered choice, else a
    // model its catalog lists. A failed or empty catalog changes nothing; coreModels only seeds a missing entry.
    if ((models.status === "fulfilled" || custom?.ids.length || configured) && initial.models.length) {
      const patch = coreModel.reconcileCoreModel(config, initial.core.id, initial.models);
      const seeded = patch ? null : coreModel.seedCoreModel(config, initial.core.id, initial.models);
      if (patch || seeded) {
        Object.assign(config, patch ?? {}, seeded ? { coreModels: seeded } : {});
        try { save(); } catch (error) { initial.warnings.push(`Couldn’t save the default model: ${error.message}`); }
      }
    }
    // Codex's own sidebar sections join the local pins and groups (codex-sections.cjs), then the renderer refreshes.
    if (codexSections.sectionsCore(owner, { coreForEngine })) {
      codexSections.importSections(owner, config).then((changed) => {
        if (!changed || owner !== client) return;
        config.sidebarRevision = (config.sidebarRevision || 0) + 1;
        try { save(); } catch {}
        emit({ kind: "sidebar-state", state: sidebarSnapshot() });
      }, (error) => console.warn(`codex sections: ${error?.message ?? error}`));
    }
    return initial;
  })();
  connecting = attempt;
  try {
    return await attempt.promise;
  } finally {
    // A stopped client's rejection must not clear a replacement connection.
    if (connecting === attempt) connecting = null;
  }
}
function popoutForSender(sender) {
  for (const entry of popouts.values()) if (entry.window.webContents === sender) return entry;
  return null;
}
function validSender(e, action) {
  // Any main window's top frame (multi-window); both split sides live in that one renderer.
  if (windowRegistry.isMainSender(e)) return "primary";
  const popout = popoutForSender(e.sender);
  if (popout && e.senderFrame === e.sender.mainFrame && POPOUT_ACTIONS.has(action)) return "popout";
  throw new Error("Untrusted renderer.");
}
function popoutList() {
  return [...popouts.values()].map((entry) => ({ sessionId: entry.sessionId, pane: entry.pane, alwaysOnTop: entry.alwaysOnTop === true, ...(entry.sessionView ? { sessionView: entry.sessionView } : {}) }));
}
// Native context menu (_W, electron-context-menu-excerpt.js:1): built from the
// webContents "context-menu" params and popped up over the window. gW keeps
// one popup at a time, so a previous one is closed first. A hidden window has
// nothing on screen to anchor the menu, so it gets none.
let openContextMenu = null;
function contextMenuAction(item, contents, params) {
  const { action, value, ...rest } = item;
  if (!action) return rest;
  const click = {
    "replace": () => contents.replaceMisspelling(value),
    "learn-spelling": () => contents.session.addWordToSpellCheckerDictionary(value),
    "look-up": () => contents.showDefinitionForSelection(),
    // Eb: http(s) only, through the same opener as the renderer's external links.
    "open-link": () => { if (externalLink(value)) shell.openExternal(new URL(value).href).catch(() => {}); },
    "copy-text": () => clipboard.writeText(value),
    "copy-image": () => contents.copyImageAt(params.x, params.y),
    "inspect": () => {
      contents.inspectElement(params.x, params.y);
      if (contents.isDevToolsOpened()) contents.devToolsWebContents?.focus();
    },
  }[action];
  return { ...rest, click };
}
function attachContextMenu(window) {
  const contents = window.webContents;
  contents.on("context-menu", (_event, params) => {
    if (window.isDestroyed() || !window.isVisible()) return;
    const template = contextMenuTemplate(params, { allowDevTools: !app.isPackaged });
    if (!template.length) return;
    const menu = Menu.buildFromTemplate(template.map((item) => contextMenuAction(item, contents, params)));
    if (openContextMenu && !openContextMenu.window.isDestroyed()) openContextMenu.menu.closePopup(openContextMenu.window);
    openContextMenu = { menu, window };
    menu.popup({ window, x: params.x, y: params.y, callback: () => { if (openContextMenu?.menu === menu) openContextMenu = null; } });
  });
}
function broadcastPopouts() {
  emit({ kind: "popouts", popouts: popoutList() });
}
// R4g-btw BT3 (X7-14, 2.42304.0 shared-11 closeSidePanePopoutsForSession from c03935b01 evictEpitaxySession): an archived
// or deleted session's pane windows close, and their panes do not dock back (entryPoint "session-removed").
function closeSidePanePopoutsForSession(sessionId) {
  for (const entry of sidePanePopoutsForSession(popouts.values(), sessionId)) {
    if (entry.window.isDestroyed()) continue;
    entry.removed = true;
    entry.window.close();
  }
}
function popoutKey(sessionId, pane) {
  return `${sessionId}\u0000${pane}`;
}
// R4i-transcript TR3 (layout-08; renderer side src/popout-restore-btw.mjs): a /btw side pane popout is its parent's
// "session" tile carrying the child it shows, cd377abb5 _r sessionView {sessionId, title (max gr=512), btwSince?}.
// Only a known /btw child of that parent, never a draft (c73f45bc3 "btw-draft:").
function btwPopoutView(parentId, value) {
  const id = value?.sessionId;
  if (typeof id !== "string" || !id || id.length > 200 || id.startsWith("btw-draft:") || ![...config.threadIds, ...config.archivedThreadIds].includes(id)) return null;
  const from = config.sessionMetadata?.[id]?.spawnedFrom;
  if (from?.btw !== true || from.sessionId !== parentId) return null;
  return { sessionId: id, title: typeof value.title === "string" && value.title ? value.title.slice(0, 512) : id, ...(Number.isFinite(value.btwSince) ? { btwSince: value.btwSince } : {}) };
}
// cd377abb5 jr/Kr: a /btw popout comes back at relaunch with its view (Sr: a "session" popout without one does not).
// popout-restore.cjs keeps no view and its "session" pane is the session popout, so these go in a file of their own.
const BTW_POPOUTS_FILE = "open-btw-popouts.json", BTW_POPOUT_KINDS = new Set(["session"]);
function saveBtwPopouts(entries) {
  const file = path.join(app.getPath("userData"), BTW_POPOUTS_FILE);
  const views = new Map(entries.filter((entry) => entry.view).map((entry) => [entry.sessionId, entry.view]));
  const list = popoutRestore.popoutSnapshot(entries, { kinds: BTW_POPOUT_KINDS }).flatMap((item) => views.has(item.sessionId) ? [{ ...item, view: views.get(item.sessionId) }] : []);
  try {
    if (!list.length) { fs.rmSync(file, { force: true }); return; }
    fs.writeFileSync(file + ".tmp", JSON.stringify({ version: 1, popouts: list }, null, 2));
    fs.renameSync(file + ".tmp", file);
  } catch { /* best effort */ }
}
function takeBtwPopouts(exists) {
  const file = path.join(app.getPath("userData"), BTW_POPOUTS_FILE);
  let raw = null;
  try { raw = JSON.parse(fs.readFileSync(file, "utf8")); } catch { raw = null; }
  try { fs.rmSync(file, { force: true }); } catch { /* best effort */ }
  const views = new Map((Array.isArray(raw?.popouts) ? raw.popouts : []).map((item) => [item?.sessionId, item?.view]));
  return popoutRestore.restorablePopouts(raw, { kinds: BTW_POPOUT_KINDS, exists }).flatMap((item) => {
    const view = btwPopoutView(item.sessionId, views.get(item.sessionId));
    return view ? [{ ...item, view }] : [];
  });
}
// Create (or focus) the pane window. The pane leaves the primary layout only
// after this resolves; closing the window docks the pane back.
// restore: a pane window reopened at launch (restorePopouts): its saved frame, placed on today's displays, and its
// Keep window on top; never from a renderer.
async function openPopout({ sessionId, pane, position, bounds: requestedBounds = null, seed = null, sessionView = null }, owner = win, restore = null) {
  if (typeof sessionId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(sessionId)) throw new Error("Unknown session.");
  if (!POPOUT_KINDS.has(pane)) throw new Error("Unknown pane.");
  const view = pane === "session" ? btwPopoutView(sessionId, sessionView) : null;
  if (pane === "session" && !view) throw new Error("Unknown session.");
  const key = popoutKey(sessionId, pane);
  const existing = popouts.get(key);
  if (existing && !existing.window.isDestroyed()) {
    // TR3: shared-11 openPopout merges the new view into the open side-pane popout (one per session and tile) and
    // focuses it; that window's tile then shows the new child (main.jsx popout-session-view).
    if (view && existing.sessionView?.sessionId !== view.sessionId) {
      existing.sessionView = view;
      existing.window.webContents.send("desktop:event", { kind: "popout-session-view", sessionView: view });
      broadcastPopouts();
    }
    existing.window.focus();
    return { existing: true, windowId: existing.window.id };
  }
  const cwd = config.threadMetadata[sessionId]?.cwd;
  if (typeof cwd !== "string" || !path.isAbsolute(cwd)) throw new Error("The session working directory is not available yet.");
  const wantsPosition = position && Number.isFinite(position.x) && Number.isFinite(position.y);
  const parentBounds = owner && !owner.isDestroyed() ? owner.getBounds() : { x: 0, y: 0, ...DEFAULT_WINDOW_SIZE };
  // cd377abb5 _i: the side chat window opens at the floating panel's screen rect (initialBounds).
  const opened = requestedBounds && [requestedBounds.x, requestedBounds.y, requestedBounds.width, requestedBounds.height].every(Number.isFinite) ? requestedBounds : null;
  const restored = restore?.bounds && Number.isFinite(restore.bounds.x) && Number.isFinite(restore.bounds.y) ? restore.bounds : opened;
  const minimum = pane === "side-chat" ? SIDE_CHAT_MIN_SIZE : POPOUT_MIN_SIZE;
  // cd377abb5 Q/Vn: a popout opens at 900x700 (defaultWidth/defaultHeight) and keeps a 400x320 minimum.
  const size = restored ? { width: Math.max(minimum.width, Math.round(restored.width)), height: Math.max(minimum.height, Math.round(restored.height)) } : { ...POPOUT_DEFAULT_SIZE };
  const window = new BrowserWindow({
    ...size,
    minWidth: minimum.width,
    minHeight: minimum.height,
    x: Math.round(restored ? restored.x : wantsPosition ? position.x : parentBounds.x + (parentBounds.width - size.width) / 2),
    y: Math.round(restored ? restored.y : wantsPosition ? position.y : parentBounds.y + (parentBounds.height - size.height) / 2),
    title: "OpenClaude Desktop",
    titleBarStyle: "hiddenInset",
    // A new pane window opens at the main window's zoom (CNr gives every
    // window the same level), so its lights start scaled.
    trafficLightPosition: scaleTrafficLights(POPOUT_TRAFFIC_LIGHTS, zoomFactorOf(win)),
    backgroundColor: windowBackground(nativeTheme.shouldUseDarkColors),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  // ownerId: the main window that popped it out, where the pane docks back (windowRegistry window-scoped event).
  installFileEditWindowGuard(window);
  const entry = { window, sessionId, pane, ...(view ? { sessionView: view } : {}), docked: false, alwaysOnTop: false, ownerId: owner && !owner.isDestroyed() ? owner.id : null,
    // The side chat's conversation moves with it (main.jsx sideChatStore export/import); handback returns it on close.
    seed: pane === "side-chat" && seed && typeof seed === "object" && JSON.stringify(seed).length <= 2_000_000 ? seed : null, handback: null };
  popouts.set(key, entry);
  // B27: an App-hosted pane window gets the main windows' IPC and events (window-registry.cjs WINDOW_KINDS.PANE).
  const appPane = APP_POPOUT_KINDS.has(pane);
  if (appPane) windowRegistry.register(window, { key: newWindowKey(), layout: { current: sessionId, split: null }, kind: WINDOW_KINDS.PANE });
  if (restore?.alwaysOnTop === true) { entry.alwaysOnTop = true; window.setAlwaysOnTop(true); }
  watchZoom(window);
  attachContextMenu(window);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (e, url) => {
    if (url !== window.webContents.getURL()) e.preventDefault();
  });
  window.webContents.once("destroyed", () => void fileSearch.cancelAll());
  window.on("closed", () => {
    if (popouts.get(key) === entry) popouts.delete(key);
    if (appPane) windowRegistry.unregister(window);
    // entryPoint "close": the side chat's own X closed the side chat with its window (cd377abb5 _i onClose), so the
    // owner does not dock it back. handback: the side chat's conversation for the owner's store.
    emit({ kind: "popout-docked", sessionId, pane, entryPoint: entry.removed ? "session-removed" : entry.closed ? "close" : entry.docked ? "dock" : "window-close", ...(entry.handback ? { data: entry.handback } : {}), ...(entry.sessionView ? { sessionView: entry.sessionView } : {}), ...(entry.ownerId !== null ? { windowId: entry.ownerId } : {}) });
    broadcastPopouts();
  });
  const query = appPane ? { window: "pane", popout: sessionId, pane, cwd } : { popout: sessionId, pane, cwd };
  if (process.env.CODE_DESKTOP_DEV_URL) {
    const url = new URL(process.env.CODE_DESKTOP_DEV_URL);
    for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
    await window.loadURL(url.href);
  } else await window.loadFile(path.join(__dirname, "../dist/index.html"), { query });
  broadcastPopouts();
  return { existing: false, windowId: window.id, bounds: window.getBounds() };
}
// Export's suggested file name: the session's title and the date (export-file-name.cjs).
const { exportFileName } = require("./export-file-name.cjs");
// A quit starting (before any window closes): the open pane windows, their frames and pins, for the next launch.
function savePopoutsForRelaunch() {
  const entries = [], btwEntries = [];
  // B27: the session popouts showing a session (a draft popout has nothing to restore; cd377abb5 wr lists code-session only).
  for (const { window, sessionId } of windowRegistry.sessionPopouts()) {
    if (!sessionId || !liveContents(window)) continue;
    let bounds = null, displayBounds = null;
    try { bounds = window.isMaximized?.() || window.isFullScreen?.() ? window.getNormalBounds() : window.getBounds(); } catch { bounds = null; }
    try { displayBounds = bounds ? (screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay()).bounds : null; } catch { displayBounds = null; }
    entries.push({ sessionId, pane: popoutRestore.SESSION_PANE, alwaysOnTop: windowRegistry.getState(window, "alwaysOnTop") === true, bounds, displayBounds });
  }
  for (const entry of popouts.values()) {
    const window = entry.window;
    if (!window || window.isDestroyed() || entry.docked) continue;
    let bounds = null, displayBounds = null, ownerKey = null;
    try { bounds = window.isMaximized?.() || window.isFullScreen?.() ? window.getNormalBounds() : window.getBounds(); } catch { bounds = null; }
    try { displayBounds = bounds ? (screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay()).bounds : null; } catch { displayBounds = null; }
    try { const owner = entry.ownerId !== null ? BrowserWindow.fromId(entry.ownerId) : null; ownerKey = owner ? windowRegistry.keyOf(owner) : null; } catch { ownerKey = null; }
    // TR3: a /btw popout ("session" tile) is saved apart, with its view.
    (entry.pane === "session" ? btwEntries : entries).push({ sessionId: entry.sessionId, pane: entry.pane, alwaysOnTop: entry.alwaysOnTop === true, bounds, displayBounds, ownerKey, ...(entry.sessionView ? { view: entry.sessionView } : {}) });
  }
  popoutRestore.savePopouts(path.join(app.getPath("userData"), popoutRestore.POPOUTS_FILE), entries, { kinds: RESTORABLE_POPOUT_KINDS });
  saveBtwPopouts(btwEntries);
}
// Launch: the pane windows of the last quit whose sessions still exist, on the main window that popped them out (else
// the first), each frame clamped onto today's displays (window-state.cjs placeOnDisplays) and its pin as it was.
async function restorePopouts() {
  const known = new Set([...(config?.threadIds ?? []), ...(config?.archivedThreadIds ?? [])]);
  const exists = (id) => known.has(id) && typeof config.threadMetadata?.[id]?.cwd === "string";
  const list = [...popoutRestore.takeRestorablePopouts(path.join(app.getPath("userData"), popoutRestore.POPOUTS_FILE),
    { kinds: RESTORABLE_POPOUT_KINDS, exists }), ...takeBtwPopouts(exists)];
  for (const item of list) {
    if (quitting) return;
    try {
      const placed = placeOnDisplays({ ...item.bounds, displayBounds: item.displayBounds }, screen);
      if (item.pane === popoutRestore.SESSION_PANE && !item.view) {
        await openSessionPopout({ sessionId: item.sessionId, restore: { bounds: { x: placed.x, y: placed.y, width: placed.width, height: placed.height }, alwaysOnTop: item.alwaysOnTop } });
        continue;
      }
      const owner = (item.ownerKey && windowRegistry.byKey(item.ownerKey)) || win;
      await openPopout({ sessionId: item.sessionId, pane: item.pane, ...(item.view ? { sessionView: item.view } : {}) }, owner, { bounds: { x: placed.x, y: placed.y, width: placed.width, height: placed.height }, alwaysOnTop: item.alwaysOnTop });
    } catch (error) { console.warn("Couldn’t reopen a pane window:", error?.message ?? error); }
  }
}
function fileSearchScope(sender, pane = "main") {
  // Main and side composers have separate @-mention lanes, independent of pane searches.
  if (pane !== "main" && pane !== "artifacts" && pane !== "composer" && pane !== "side-composer")
    throw new Error("Unknown file browser.");
  return `${sender.id}:files:${pane}`;
}
/** B39: the New session page's Preview owner ("home:<folder>") as {id, cwd}, for a folder fileSearchRoot trusts; else null. */
function previewHomeOwner(id) {
  if (typeof id !== "string" || !id.startsWith("home:") || !config) return null;
  try { return { id, cwd: fileSearchRoot(null, id.slice(5)) }; } catch { return null; }
}
function fileSearchRoot(sessionId, homeWorkspace) {
  let cwd;
  if (sessionId == null) {
    if (homeWorkspace === undefined) cwd = config.cwd;
    else {
      const known = [config.cwd, ...approvedWorkspaceRoots,
        ...[...config.threadIds, ...config.archivedThreadIds]
          .map(id => config.threadMetadata[id]?.cwd)];
      cwd = known.find(value => typeof value === "string" && value === homeWorkspace);
      if (!cwd) throw new Error("Unknown home workspace. Choose a folder first.");
    }
  }
  else {
    if (typeof sessionId !== "string" ||
        ![...config.threadIds, ...config.archivedThreadIds].includes(sessionId))
      throw new Error("Unknown session.");
    cwd = config.threadMetadata[sessionId]?.cwd;
  }
  if (typeof cwd !== "string" || !path.isAbsolute(cwd))
    throw new Error("The session working directory is not available yet.");
  return cwd;
}
// Built-in terminal pane (terminal-service.cjs): login-shell PTYs per session, started in the folder fileSearchRoot
// trusts for that session (or the New session page's folder) and ended with their session, their folder or the app.
// CODE_DESKTOP_TERMINAL_SHELL (an absolute path) replaces the user's shell for automated runs, which then never read
// the user's shell startup files for the proxy either. Agent tools reach it as ctx.terminals (agent-tools/terminal.mjs).
/** The variables the app sets in its own environment for the cores only: saved keys and endpoints (never for shells). */
function coreSecretEnvKeys() {
  const keys = new Set();
  try { for (const key of Object.keys(require("./codex.cjs").foreignCoreEnv())) keys.add(key); } catch { /* none */ }
  try { for (const key of Object.keys(harnessProfile.coreEnvKeys())) keys.add(key); } catch { /* none */ }
  return [...keys];
}
const terminalService = createTerminalService({
  shellIntegrationDir: () => path.join(app.getPath("userData"), "terminal-shell-integration"),
  resolveOwner: ({ sessionId, homeWorkspace }) => fileSearchRoot(sessionId, homeWorkspace),
  ownerAlive: (_owner, sessionId) => !sessionId || [...(config?.threadIds ?? []), ...(config?.archivedThreadIds ?? [])].includes(sessionId),
  ...(process.env.CODE_DESKTOP_TERMINAL_SHELL ? { shell: process.env.CODE_DESKTOP_TERMINAL_SHELL, shellProxy: null } : {}),
  version: app.getVersion(),
  // The keys Settings › Models exports into the app's environment for the cores (DEEPSEEK_API_KEY, a relay's base URL,
  // provider keys, the Codex endpoint key) never reach a shell, a command the agent types or a program run there.
  stripEnv: () => coreSecretEnvKeys(),
  // The agents this app installed (Qwen, Gemini… under the app's own Node) answer by name in the Terminal pane, so a
  // core's "run it in a terminal" fallback works there (core-manager.cjs terminalShims).
  appendPath: () => { const dir = coreManager.terminalShims?.(path.join(app.getPath("userData"), "terminal-bin")); return dir ? [dir] : []; },
});
// How long an automatic unread mark (a turn finished in a session the asking window does not show) waits for the
// windows' layout reports before deciding (sidebar-state "metadata").
const AUTOMATIC_UNREAD_SETTLE_MS = 400;
// Set once desktop:call is registered: only then can a (re)created main
// window's renderer initialise.
let desktopReady = false;
// OLi: the main window. Its frame comes from userData/window-state.json (Sbe
// over Dfn 1200x800, placed on the current displays), with the source's
// minWidth 600 / minHeight 400, titleBarStyle "hidden", trafficLightPosition
// uun() ({17,17} at 100%) and backgroundColor jP().
// Multi-window: `key` names the window's own frame file (window-state.cjs windowStateFile; the first window keeps
// window-state.json) and its entry in open-windows.json; `layout` is what it shows (window-registry.cjs sanitizeLayout,
// handed to its renderer by init); a new window without a frame cascades from `from`.
function createMainWindow({ key = MAIN_WINDOW_KEY, layout = null, from = null, position = null } = {}) {
  const stateFile = path.join(app.getPath("userData"), windowStateFile(key));
  const stored = loadWindowState(stateFile, screen);
  // position: a session torn off the sidebar opens at the cursor (window-open, positionWindowState).
  const saved = position && !fs.existsSync(stateFile) ? positionWindowState(stored, position, screen)
    : from && !from.isDestroyed() && !fs.existsSync(stateFile) ? cascadeWindowState(stored, from.getBounds(), screen) : stored;
  // A window after the first opens once its page has painted (no blank frame); an automated offscreen launch
  // (CODE_DESKTOP_OFFSCREEN_LAUNCH) keeps those extra windows hidden.
  const deferShow = windowRegistry.mainWindows().length > 0;
  const startZoom = liveContents(win) ? zoomFactorOf(win) : zoomHint();
  const window = new BrowserWindow({
    ...windowStateBounds(saved),
    ...(deferShow ? { show: false } : {}),
    minWidth: 600,
    minHeight: 400,
    title: "OpenClaude Desktop",
    titleBarStyle: "hidden",
    // SBn(): the lights start where the remembered zoom puts them; the page takes that zoom when its first load
    // commits (below). A window opened beside a live main window takes that window's zoom instead (CNr: every
    // window shares one level).
    trafficLightPosition: trafficLightPosition(startZoom),
    backgroundColor: windowBackground(nativeTheme.shouldUseDarkColors),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  // The source's Chromium host zoom comes back on its own; this file:// page's does not, so the start zoom is set
  // once the first load commits (setZoomLevel needs a committed entry). Not webPreferences.zoomFactor: Electron
  // re-applies that default on every later navigation whenever the level is back at 0 (Chromium keeps no host
  // entry for the default level), so Actual Size followed by a reload (⌘R, a language or core switch) would bring
  // the launch zoom back.
  if (startZoom !== 1) window.webContents.once("did-navigate", () => {
    if (!liveContents(window)) return;
    window.webContents.setZoomFactor(startZoom);
    placeTrafficLights(window);
    if (window === win) zoomSettled();
  });
  windowRegistry.register(window, { key, layout });
  if (!liveContents(win)) win = window;
  if (deferShow && !process.env.CODE_DESKTOP_OFFSCREEN_LAUNCH) window.once("ready-to-show", () => { if (!window.isDestroyed()) window.show(); });
  mainHidden = false;
  // Sbe manage(): stored maximize / full screen first, then the save listeners.
  restoreWindowState(window, saved);
  trackWindowState(window, { file: stateFile, screen, state: saved });
  const fullScreenState = () => {
    emit({ kind: "window", fullScreen: window.isFullScreen(), windowId: window.id });
    if (window === win) installAppMenu();
  };
  installFileEditWindowGuard(window);
  window.on("enter-full-screen", fullScreenState);
  window.on("leave-full-screen", fullScreenState);
  window.on("show", () => { mainHidden = false; windowRegistry.setState(window, "hidden", false); });
  // T (focus) → iSi(0): the focused main window's level is re-applied, clamped, to every window with its lights.
  window.on("focus", () => { adoptMainWindow(window); applyZoom({ delta: 0 }); desktopSettings?.clearNotices?.(); });
  // A reload (⌘R) restores what the window showed: taken before the new page reports its own (empty) layout.
  window.webContents.on("did-start-loading", () => windowRegistry.captureLaunch(window));
  // index.chunk-ChZ67Jhw.js m.on("close"): unless the app is quitting the
  // close is prevented and the window hides (leaving full screen first); the
  // app keeps running and the Dock, Window > Show Main Window and the tray's
  // Show App bring it back.
  // Multi-window (macOS): closing one of several main windows closes it for good; only the last one hides. A quit's
  // first close writes the open windows and their layouts for the next launch (window-registry.cjs freeze).
  window.on("close", (event) => {
    if (quitting) windowRegistry.freeze();
    // Session popouts (B27) do not keep the app's sidebar window: only another full window lets this one close.
    else if (windowRegistry.fullWindows().some((other) => other !== window)) return;
    const action = closeAction({ quitting, fullScreen: window.isFullScreen() });
    if (action === "close") return;
    event.preventDefault();
    const hide = () => { if (window.isDestroyed()) return; mainHidden = true; windowRegistry.setState(window, "hidden", true); window.hide(); };
    if (action === "leave-full-screen") { window.once("leave-full-screen", hide); window.setFullScreen(false); }
    else hide();
  });
  window.on("closed", () => {
    windowRegistry.unregister(window);
    // Closed for good (not by a quit): its own frame file goes with it.
    if (!quitting) forgetWindowState(stateFile);
    if (win === window) {
      win = null;
      const next = windowRegistry.lastFocused();
      if (next) return void adoptMainWindow(next);
    }
    // File › New Window follows the open session popouts (adoptMainWindow above rebuilds the menu itself).
    if (!quitting) installAppMenu();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  watchZoom(window);
  attachContextMenu(window);
  window.webContents.on("render-process-gone", () => void fileSearch.cancelAll());
  window.webContents.once("destroyed", () => void fileSearch.cancelAll());
  window.webContents.on("will-navigate", (e, url) => {
    if (url !== window.webContents.getURL()) e.preventDefault();
  });
  return window;
}
function loadMainWindow(window) {
  if (process.env.CODE_DESKTOP_DEV_URL) return window.loadURL(process.env.CODE_DESKTOP_DEV_URL);
  return window.loadFile(path.join(__dirname, "../dist/index.html"));
}
// "activate" / KK with no main window left: a fresh one over the same session state.
async function openMainWindow(options) {
  const window = createMainWindow(options);
  installAppMenu();
  await loadMainWindow(window);
  return window;
}
// B27 session popouts (cd377abb5 xi over Q: a "code-session" popout, or a "code-draft" one for File › New Window; shared-11
// Zo keys a code-session popout by its session id). A sidebar-less window with one session, its own tile layout, Keep
// window on top and Open in main window, and no split view: the renderer (?window=session, main.jsx SESSION_POPOUT)
// leaves the sidebar and the split grid out. It is registered in windowRegistry like a main window (same IPC and event
// routing) but as WINDOW_KINDS.SESSION, so it never counts as the app's main window, is not written to
// open-windows.json, and comes back after a relaunch through popout-restore.cjs (pane "session") with its frame and pin.
// Q: 900x700 by default (Vn), 400x320 minimum; opened at the cursor for a tear-off (initialPosition), at the saved frame
// for a relaunch (restoreBounds, shown inactive like entryPoint "relaunch_restore"), else centred on the window it
// came from. Opening a session that already has a popout focuses it (Zo openPopout: setBounds to a new initialPosition).
async function openSessionPopout({ sessionId = null, from = win, position = null, restore = null, inactive = false } = {}) {
  if (quitting || !desktopReady) return null;
  if (sessionId !== null) {
    const existing = windowRegistry.popoutFor(sessionId);
    if (existing) {
      if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
        const [width, height] = existing.getSize();
        const placed = placeOnDisplays({ x: Math.round(position.x), y: Math.round(position.y), width, height }, screen);
        existing.setPosition(Math.round(placed.x), Math.round(placed.y));
      }
      showWindow(existing);
      return { windowId: existing.id, existing: true };
    }
  }
  const say = (source) => (i18n ? i18n.t(source) : source);
  if (windowRegistry.sessionPopouts().length >= MAX_SESSION_POPOUTS) throw new Error(say("Close a window before opening another."));
  const restored = restore?.bounds && [restore.bounds.x, restore.bounds.y, restore.bounds.width, restore.bounds.height].every(Number.isFinite) ? restore.bounds : null;
  const size = restored ? { width: Math.max(POPOUT_MIN_SIZE.width, Math.round(restored.width)), height: Math.max(POPOUT_MIN_SIZE.height, Math.round(restored.height)) } : { ...POPOUT_DEFAULT_SIZE };
  let frame = null;
  if (restored) frame = { x: Math.round(restored.x), y: Math.round(restored.y), ...size };
  else if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) frame = placeOnDisplays({ x: Math.round(position.x), y: Math.round(position.y), ...size }, screen);
  else if (from && !from.isDestroyed()) { const parent = from.getBounds(); frame = { x: Math.round(parent.x + (parent.width - size.width) / 2), y: Math.round(parent.y + (parent.height - size.height) / 2), ...size }; }
  const window = new BrowserWindow({
    ...size,
    ...(frame ? { x: Math.round(frame.x), y: Math.round(frame.y) } : {}),
    show: false,
    minWidth: POPOUT_MIN_SIZE.width,
    minHeight: POPOUT_MIN_SIZE.height,
    title: "OpenClaude Desktop",
    titleBarStyle: "hidden",
    trafficLightPosition: trafficLightPosition(1),
    backgroundColor: windowBackground(nativeTheme.shouldUseDarkColors),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  windowRegistry.register(window, { key: newWindowKey(), layout: { current: sessionId, split: null }, kind: WINDOW_KINDS.SESSION });
  const pinned = restore?.alwaysOnTop === true;
  windowRegistry.setState(window, "alwaysOnTop", pinned);
  if (pinned) window.setAlwaysOnTop(true);
  // Q showInactive: a popout restored at launch opens behind the window the user is in.
  if (!process.env.CODE_DESKTOP_OFFSCREEN_LAUNCH) window.once("ready-to-show", () => { if (!window.isDestroyed()) { if (restore || inactive) window.showInactive(); else window.show(); } });
  installFileEditWindowGuard(window);
  const fullScreenState = () => {
    emit({ kind: "window", fullScreen: window.isFullScreen(), windowId: window.id });
    if (window === win) installAppMenu();
  };
  window.on("enter-full-screen", fullScreenState);
  window.on("leave-full-screen", fullScreenState);
  window.on("focus", () => { adoptMainWindow(window); desktopSettings?.clearNotices?.(); });
  window.webContents.on("did-start-loading", () => windowRegistry.captureLaunch(window));
  window.on("closed", () => {
    windowRegistry.unregister(window);
    if (win === window) {
      win = null;
      const next = windowRegistry.lastFocusedFull() ?? windowRegistry.lastFocused();
      if (next) return void adoptMainWindow(next);
    }
    if (!quitting) installAppMenu();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  watchZoom(window);
  attachContextMenu(window);
  window.webContents.on("render-process-gone", () => void fileSearch.cancelAll());
  window.webContents.once("destroyed", () => void fileSearch.cancelAll());
  window.webContents.on("will-navigate", (e, url) => {
    if (url !== window.webContents.getURL()) e.preventDefault();
  });
  installAppMenu();
  const query = { window: "session" };
  if (process.env.CODE_DESKTOP_DEV_URL) {
    const url = new URL(process.env.CODE_DESKTOP_DEV_URL);
    for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
    await window.loadURL(url.href);
  } else await window.loadFile(path.join(__dirname, "../dist/index.html"), { query });
  return { windowId: window.id, existing: false };
}
// The full window a session popout docks into (Open in main window): the full window focused last, shown again when it
// was closed (hidden) or minimized, else a new one.
async function dockTargetWindow() {
  const full = windowRegistry.lastFocusedFull();
  if (liveContents(full)) return full;
  if (quitting || !desktopReady) return null;
  return openMainWindow();
}
app.whenReady().then(async () => {
  require("electron").protocol.handle(FILE_PREVIEW_SCHEME, filePreviewFrames.handle);
  require("electron").protocol.handle(MCP_APP_SANDBOX_SCHEME, mcpAppSandbox.handle);
  // R4g review fix: the MCP App frames get no device permissions (2.42304.0 defaultSession handlers refuse them).
  guardSandboxPermissions(require("electron").session.defaultSession);
  const preferences = await import("./preferences.mjs");
  const { settingsPatch, validateServiceTier, DEFAULT_THEME } = preferences;
  const { recordCoreModel, validateCoreModels } = await import("./prefs/core-model.mjs");
  themePreference = preferences.themePreference;
  i18n = await import("./i18n/index.mjs");
  const { validateBypassRequest, nativeCollaborationMode, backgroundTurnPermission } = await import("./permission-policy.mjs");
  const { applyCodexPermissions, effectiveProfile, customProfiles, codexWorkflowArgs } = await import("./codex-permissions.mjs");
  // Bypass across a user core switch (bypass-carry.mjs): a one-shot token from the select, bound by that switch's
  // own reconnect; any other reconnect, an opt-out or the renderer's clear drops it. Memory only.
  const { carryScope, requestCarry, bindCarry, carryFor } = await import("./bypass-carry.mjs");
  let switchToken = null, bypassCarry = null;
  configPath = path.join(app.getPath("userData"), "preferences.json");
  // DeepSeek core privacy (code-desktop-app cordis.patch.yml): '1' only when the user turned sharing on.
  const syncPrivacyEnv = ({ pending = true } = {}) => {
    harnessProfile.setCoreEnv("CODE_DESKTOP_SHARE_SESSION_LOG", config?.deepseekSessionLog === true ? "1" : null, { pending });
    harnessProfile.setCoreEnv("CODE_DESKTOP_SHARE_FEEDBACK", config?.deepseekFeedbackSharing === true ? "1" : null, { pending });
  };
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    config = {};
  }
  const workspace = path.join(app.getPath("documents"), "OpenClaude Desktop");
  fs.mkdirSync(workspace, { recursive: true });
  config = {
    cwd: workspace,
    // shared-7 xh bi("userThemeMode","auto"): new profiles follow the system.
    theme: DEFAULT_THEME,
    model: "",
    effort: "medium",
    mode: "code",
    threadIds: [],
    archivedThreadIds: [],
    threadMetadata: {},
    // 2.2553.1 zk: the greeting only uses a preferred name the user set; no OS
    // user name is invented. Existing profiles keep whatever they saved.
    displayName: "",
    sidebarWidth: 288,
    // shared-2 Zm {collapsed:false, sidebarWidth:288}: collapsed persists with width.
    sidebarCollapsed: false,
    stats: {},
    activity: { startedAt: new Date().toISOString(), days: {} },
    sidebarPreferences: {},
    sessionMetadata: {},
    customGroups: [],
    pinnedOrder: [],
    // Fidelity F08: persisted Folder/Custom section order (sidebar-groups.js:19700-19728).
    projectOrder: [],
    rememberedActionCenterCounts: { sessions: 0, projects: 0, prs: 0 },
    worktreeBases: {},
    // Per-session turned-off tools (prefs/tool-profiles.mjs), keyed by thread id.
    threadTools: {},
    toolProfiles: [],
    defaultToolProfile: null,
    // Source settings default menuBarEnabled:true; profiles without it get the tray.
    menuBarEnabled: true,
    // Fidelity F14 (index.chunk-ChZ67Jhw.js preference defaults; c71860c77-yvGrrWO9.js:2270): unset notification
    // levels read as Banners and keep-awake (+ on battery) as on, so profiles without the keys show the effective value.
    permissionNotifications: "banner",
    questionNotifications: "banner",
    completeNotifications: "banner",
    keepAwake: true,
    keepAwakeOnBattery: true,
    ...config,
  };
  // Task complete offers only Off/Banners (c71860c77:2004-2029); an older saved 'badge' reads as Banners.
  if (config.completeNotifications === "badge") config.completeNotifications = "banner";
  // R2-sections: config.sidebarSections (shared-52 kp/Bp). Only an existing record is kept in step here; the sections
  // layout seeds it from customGroups / customGroupId / "ccg::" order at the switch (electron/sidebar-sections-store.mjs).
  sidebarSectionsStore = await import("./sidebar-sections-store.mjs");
  try { sidebarSectionsStore.syncSidebarSections(config); } catch (error) { console.warn("Sidebar sections:", error?.message ?? error); }
  artifactIndex = await import('./artifact-index.mjs');
  syncPrivacyEnv({ pending: false });
  if (!config.worktreeBases || typeof config.worktreeBases !== "object") config.worktreeBases = {};
  if (!config.threadTools || typeof config.threadTools !== "object" || Array.isArray(config.threadTools)) config.threadTools = {};
  // Each core's chosen default model (prefs/core-model.mjs), owned by this process.
  const coreModels = validateCoreModels(config.coreModels);
  if (coreModels) config.coreModels = coreModels; else delete config.coreModels;
  // Imported cores, then the chosen core (config.core), before the first spawn; the menus name its assistant.
  extensionPacks.load();
  // A bundled pack added from an older OpenClaude Desktop is replaced by this app's newer copy (its pinned agent release).
  await extensionPacks.upgradeBundled().catch((error) => console.warn("Bundled pack update failed:", error?.message ?? error));
  // Codex became a bundled Extension Pack: a choice of it made before (or of any bundled pack not added yet) adds that
  // pack now, so the choice holds instead of falling back to DeepSeek.
  const chosenId = process.env.CODE_DESKTOP_CORE || config.core;
  if (typeof chosenId === "string" && chosenId !== "deepseek" && !extensionPacks.descriptors().some((core) => core.id === chosenId))
    await extensionPacks.installBundled(chosenId).catch((error) => console.warn("Bundled pack install failed:", error?.message ?? error));
  coreManager.apply();
  i18n.setAssistantName(chosenAssistant());
  // index.chunk-ChZ67Jhw.js startup nativeTheme.themeSource = userThemeMode,
  // before any window exists: native menus, dialogs, the window background and
  // every renderer's prefers-color-scheme follow the app's choice.
  nativeTheme.themeSource = themePreference(config.theme);
  i18n.setLocale(config.locale);
  // Cores started from now on get the UI language (a bridge passes it on: Qwen's QWEN_CODE_LANG).
  process.env.CODE_DESKTOP_LOCALE = i18n.getLocale();
  // jP / nativeTheme.on("updated"): every live window repaints its native
  // background with the resolved appearance (main and pane windows alike).
  nativeTheme.on("updated", () => {
    for (const window of BrowserWindow.getAllWindows())
      if (!window.isDestroyed()) window.setBackgroundColor(windowBackground(nativeTheme.shouldUseDarkColors));
  });
  if (!fs.existsSync(config.cwd)) config.cwd = workspace;
  approvedWorkspaceRoots.add(config.cwd);
  // The agent tools channel is up before the first core spawns (connect() runs on the renderer's init); every core
  // then gets its variables, and a Codex child the -c overrides (codex.cjs setAgentToolsLaunch).
  previewService = createPreviewService({
    electron: { WebContentsView: require("electron").WebContentsView, BrowserWindow, session: require("electron").session, shell, nativeTheme, dialog },
    // A session, or the New session page's folder ("home:<folder>", terminal-store ownerKeyOf; B39 landing preview).
    getSession: (id) => agentToolSession(id) ?? previewHomeOwner(id),
    // B39 Settings › Code › Browser › Allowed sites (2.31226.0 launchPreviewAllowedOrigins).
    getAllowedOrigins: () => Array.isArray(config?.previewAllowedOrigins) ? config.previewAllowedOrigins : [],
    setAllowedOrigins: (list) => { if (!config) return; if (list.length) config.previewAllowedOrigins = list; else delete config.previewAllowedOrigins; save(); },
    // The window a pane request came from (main windows and pane popouts; window-registry.cjs), and app-wide notices
    // (the agent revealing a session's preview) to every main window.
    hostWindow: (sender) => windowRegistry.hostWindow(sender),
    // Servers & settings › Keep cookies (config.previewKeepCookies; off: an in-memory session for this app run).
    keepCookies: () => config?.previewKeepCookies === true,
    getStorageMode: () => config?.previewStorage,
    getStoredPartitions: () => Array.isArray(config?.previewStoragePartitions) ? config.previewStoragePartitions : [],
    setStoredPartitions: names => { if (config) { config.previewStoragePartitions = names; save(); } },
    setStorageMode: mode => { if (config) { config.previewStorage = mode; save(); } },
    isCoworkSession: id => config?.sessionMetadata?.[id]?.surface === "cowork",
    // cf580efe9 Pi: each session's last dev-server page, shown dimmed after a relaunch (preview-service.cjs saveFrames).
    frameDir: path.join(app.getPath("userData"), "preview-frames"),
    setKeepCookies: (enabled) => { if (!config) return; if (enabled) config.previewKeepCookies = true; else delete config.previewKeepCookies; save(); },
    broadcast: (event) => { windowRegistry.broadcast(event); },
    spawnEnv: async () => {
      const { loginShellVariables, loginShellProxy, proxyEnv } = require("./proxy-env.cjs");
      // Fixture launches (CODEX_BINARY) never run the user's rc files, as codex.cjs.
      const shell = process.env.CODEX_BINARY ? {} : await loginShellVariables(["PATH"]).catch(() => ({}));
      const proxy = process.env.CODEX_BINARY ? {} : await loginShellProxy().catch(() => ({}));
      const env = { ...process.env, ...proxyEnv(process.env, proxy) };
      env.PATH = [shell.PATH, path.join(os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH].filter(Boolean).join(":");
      // No app secrets or internals reach a dev server (the search key and every other CODE_DESKTOP_* variable included).
      for (const key of coreSecretEnvKeys()) delete env[key];
      for (const key of Object.keys(env)) if (key.startsWith("CODE_DESKTOP_") || key.startsWith("ELECTRON_")) delete env[key];
      return env;
    },
  });
  windowRegistry.onWindowClosed((window) => previewService?.windowClosed(window));
  try { await agentTools.start(); } catch (error) { console.warn(`Agent tools unavailable: ${error?.message ?? error}`); }
  require("./codex.cjs").setAgentToolsLaunch(() => ({ env: agentTools.launchEnv(), codexArgs: agentTools.codexArgs() }));
  // The first spawn of any client (often the Home stats card's, before connect() runs) waits for Settings › Models'
  // launch: a saved Codex custom endpoint's -c args and the exported keys. Once: connect() refreshes it after that.
  let launchPrepared = null;
  require("./codex.cjs").setBeforeSpawn(() => (launchPrepared ??= Promise.resolve().then(() => modelSettings.ready?.()).catch((error) => { console.warn("Couldn’t prepare the core launch:", error?.message ?? error); })));
  client = new CodexClient();
  client.on("event", receive);
  const firstClient = client;
  client.on("status", (s) => {
    if (!s.connected) initial = null;
    receive(connectionEvent(firstClient, s));
  });
  // Relaunch reopens the main windows of the last quit, each with its layout (window-registry.cjs open-windows.json;
  // a first launch opens the one main window).
  const restoredWindows = windowRegistry.read();
  for (const entry of restoredWindows.windows) createMainWindow(entry);
  // A banner is skipped only while a focused, visible window shows its session (NotificationService isUserViewingSession):
  // a session finishing behind another one in the focused window still notifies.
  desktopSettings = createDesktopSettings({app,powerSaveBlocker,powerMonitor,Notification,getConfig:()=>config,getClient:()=>client,sessionOperations,save,getWindow:()=>win,gitStatus:workspaceGitStatus,
    // R2-btw (NBS-7): an inactivity-rule archive cascades settled /btw children too (archiveCascadeOf "rule").
    emit:(event)=>{emit(event);if(event?.kind==="desktop-archived")void btwSessions.cascadeParentArchive({parentId:event.threadId}).catch((error)=>console.warn("Side session cascade:",error.message));},
    isViewingSession:(id)=>windowRegistry.windowsShowing(id).some((window)=>!window.isDestroyed()&&window.isVisible()&&window.isFocused()),
    isAppFocused:()=>BrowserWindow.getAllWindows().some((window)=>!window.isDestroyed()&&window.isFocused())});
  desktopSettings.start();
  // Workflow agents run on the same core as sessions (the DeepSeek bridge by default).
  // Read at each start, so a core switch or a Codex endpoint change reaches workflow agents too.
  // A Codex core's workflow agents get the session's own Codex sandbox — its permission profile, Sandbox network
  // access and writable roots — as -c launch overrides (codex-permissions.mjs codexWorkflowArgs; the runner is unchanged).
  const workflowCore=(run={})=>{
    const core=resolveCore();let launch=workflowCoreCommand(core,process.env.CODE_DESKTOP_WORKFLOW_BINARY);
    // The environment a session's core gets (proxy and shell variables, PATH, local environment): a Finder-launched app
    // has none of it, and without it workflow agents fail where the same session works (Gemini on Vertex behind a proxy).
    if(!process.env.CODE_DESKTOP_WORKFLOW_BINARY)launch={...launch,env:{...require("./codex.cjs").workflowCoreEnv(core.kind),...(launch.env||{})}};
    // The core's own Claude tier map (descriptor workflowModelTiers): opus/sonnet/haiku in a script pick its models.
    const tiers=coreForEngine(client?.serverInfo?.engine).workflowModelTiers;
    if(tiers&&typeof tiers==='object')launch={...launch,env:{...(launch.env||{}),CODE_DESKTOP_WORKFLOW_MODEL_TIERS:JSON.stringify(tiers)}};
    if(core.kind!=='codex'||process.env.CODE_DESKTOP_WORKFLOW_BINARY)return launch;
    const extra=codexWorkflowArgs({access:run.access,turn:typeof run.threadId==='string'?workflowToolService?.turnOptions(run.threadId):null,networkAccess:config.sandboxNetworkAccess===true,profile:effectiveProfile(config.codexPermissionProfile,undefined)});
    return extra.length?{...launch,args:[...(launch.args??['app-server','--stdio']),...extra]}:launch;
  };
  workflowService=createWorkflowService({root:path.join(app.getPath("userData"),"workflows"),getConfig:()=>config,emit,core:workflowCore,version:app.getVersion(),
    enabled:()=>workflowSettings().enabled,runnerEnv:()=>workflowRunnerEnv(workflowSettings()),onSettled:run=>{void workflowToolService?.settled(run);},workflowFolders:coreWorkflowFolders});
  // The model's Workflow tool: per-session scripts under the app's data (never ~/.claude/projects); its finished runs
  // reach the model as a new turn with the session's last turn options (workflow-tool-service.cjs).
  workflowToolService=createWorkflowToolService({workflowService,getConfig:()=>config,settings:workflowSettings,customPrompt:()=>instructionsService.customPromptActive(),dataRoot:path.join(app.getPath("userData"),"sessions"),home:os.homedir(),
    updateConfig:patch=>{config={...config,...patch};save();emitConfig();},
    requestApproval:(session,request,options)=>agentToolAsk(session,request,options),
    // A session's ultracode/size reminder state, kept with OpenClaude Desktop's own session metadata so a relaunch still sends
    // "Ultracode is off" when the core's history says it was on (thread metadata is replaced by the core's).
    reminderStore:{get:id=>config?.sessionMetadata?.[id]?.workflowReminders,set:(id,state)=>{if(!config?.threadIds?.includes(id))return;config.sessionMetadata??={};config.sessionMetadata[id]={...(config.sessionMetadata[id]??{}),workflowReminders:state};save();}},
    core:()=>({structuredOutput:runnerStructuredOutput(),workflowFolders:coreWorkflowFolders()}),
    // The ultracode reminders name the tool that runs this session's workflows: OpenClaude Desktop's Workflow tool, or on the
    // core's own engine its own tool (descriptor workflowTool, e.g. ZCode's CreateWorkflow after its skill).
    workflowTool:()=>{if(currentWorkflowEngine()!=="native")return {engine:"codeDesktop",...(agentToolsDeferred().includes("workflow")?{deferred:true}:{})};const tool=coreForEngine(client?.serverInfo?.engine).workflowTool;return {engine:"native",...(tool&&typeof tool==="object"?{name:tool.name,skill:tool.skill}:{})};},
    validateAccess:async()=>{const owner=client;const {validateBypassRequest}=await import("./permission-policy.mjs");await validateBypassRequest({sandbox:"danger-full-access"},()=>config,()=>owner.request("configRequirements/read",{}));},
    notify:run=>desktopSettings?.notifyWorkflow?.(run),
    // Bypass for a session's background work only while it is still the Mode and its opt-in is on: a Mode change or an
    // opt-out reaches the turns already scheduled, Monitor events and workflow notifications, and the app tools'
    // Bypass auto-approval (sessionAccess), not just the next message the user sends.
    bypassAllowed:()=>config?.allowBypassPermissions===true&&config?.permission==="bypass",
    // A background turn: the session's last turn options with its permission as the Mode now allows (a recorded Bypass
    // becomes Auto's workspace-write, with the chosen Codex profile), then checked like any turn/start (the opt-in and
    // the core's requirements) before it is sent.
    startTurn:async(threadId,params)=>{const owner=client;await owner.start();
      const networkAccess=config.sandboxNetworkAccess===true;
      let next=backgroundTurnPermission(params,{bypassAllowed:config?.allowBypassPermissions===true&&config?.permission==="bypass",networkAccess});
      // A Bypass the core no longer allows (its requirements changed) runs as Auto too, rather than failing for ever.
      try{await validateBypassRequest(next,()=>config,()=>owner.request("configRequirements/read",{}));}catch{next=backgroundTurnPermission(next,{bypassAllowed:false,networkAccess});}
      if(next!==params&&coreForEngine(owner.serverInfo?.engine).kind==="native"&&owner.serverInfo?.capabilities?.permissionHints!==true)applyCodexPermissions("turn/start",next,{profile:effectiveProfile(config.codexPermissionProfile,undefined)});
      if(owner!==client)throw coreError(owner,"The {core} connection changed. Try again.");
      // The recorded options carry the tools and instructions of the session's last message; the turn gets the current
      // ones (Tools menu, Settings › Instructions), so a change since then isn't undone by a background turn.
      next={...next};
      if(owner.serverInfo?.capabilities?.toolSelection===true){const hint=next.codeDesktop&&typeof next.codeDesktop==="object"?next.codeDesktop:{};next.codeDesktop={...hint,tools:normalizeSelection(config.threadTools[threadId])};}
      instructionsService.decorate("turn/start",next);
      const release=sessionOperations.reserveMessage(threadId);try{await owner.request("turn/start",next);}finally{release?.();}}});
  terminalService.install(ipcMain, { trustedSender: (event) => { try { return !!validSender(event, "terminal"); } catch { return false; } } });
  const { createLocalRoutines } = await import('./local-routines.mjs');
  const { createRoutineRunner, captureRoutineOptions } = await import('./routine-runner.mjs');
  const { CoworkMainHost } = await import('./cowork-runtime/main-host.mjs');
  const { CoworkSessions, COWORK_ENGINE } = await import('./cowork-runtime/session-service.mjs');
  const coworkHost = new CoworkMainHost();
  coworkSessions = new CoworkSessions({ dataDir: app.getPath('userData'), host: coworkHost,
    provider: model => modelSettings.coworkConnection(model), approveFolder: cwd => workspaceQueryRoot(cwd), emit: receive,
    approval: async (method, params, options) => { const owner = client; await owner.start(); if (owner !== client) return null; return owner.localApproval(method, params, options); },
    onThread: thread => { const { turns, ...metadata } = thread; config.threadMetadata[thread.id] = metadata; save(); },
  });
  async function requestCowork(p) {
    if (!COWORK_ENABLED) throw new Error(i18n.t('Cowork is still in development.'));
    const params = { ...(p.params || {}), codeDesktop: { ...p.params?.codeDesktop } };
    const { takeSurface } = await import('./surface-policy.mjs');
    const surface = takeSurface(params);
    const { applyProjectContext } = await import('./local-projects.mjs');
    const project = applyProjectContext(config, p.method, params, surface);
    if (p.method !== 'thread/start' && ![...config.threadIds, ...config.archivedThreadIds].includes(params.threadId)) throw new Error('Unknown Cowork session.');
    if (['thread/archive', 'thread/delete'].includes(p.method)) sessionOperations.assertAvailable(params.threadId);
    const release = p.method === 'turn/start' ? sessionOperations.reserveMessage(params.threadId) : null;
    let result;
    try { result = await coworkSessions.request(p.method, params); } finally { release?.(); }
    const id = result.thread?.id || params.threadId;
    if (p.method === 'thread/start') {
      config.threadIds = [...new Set([id, ...config.threadIds])];
      config.sessionMetadata[id] = { surface: 'cowork', engine: COWORK_ENGINE, ...(project ? { projectId: project.id } : {}) };
      config.stats[id] = { messages: 0, tokens: 0, observedTokens: 0, observedUsage: { input: 0, output: 0, cached: 0, cacheWrite: 0 }, ids: [] };
      save(); emitConfig(); emitSessionList('added', result.thread);
    } else if (p.method === 'thread/name/set') emit({ kind: 'session-list', op: 'renamed', threadId: id, name: params.name });
    else if (p.method === 'thread/archive' || p.method === 'thread/unarchive') {
      const archive = p.method === 'thread/archive';
      config.threadIds = config.threadIds.filter(value => value !== id);
      config.archivedThreadIds = config.archivedThreadIds.filter(value => value !== id);
      (archive ? config.archivedThreadIds : config.threadIds).unshift(id);
      if (archive) { monitorService.stopSession(id); scheduleService.removeSession(id); }
      save(); emitSessionList(archive ? 'archived' : 'unarchived', id);
    } else if (p.method === 'thread/delete') {
      config.threadIds = config.threadIds.filter(value => value !== id); config.archivedThreadIds = config.archivedThreadIds.filter(value => value !== id);
      delete config.threadMetadata[id]; delete config.sessionMetadata[id]; delete config.stats[id];
      config.pinnedOrder = (config.pinnedOrder || []).filter(value => value !== id);
      save(); emitSessionList('deleted', id);
    }
    return result;
  }
  const routineContext = async (engine = COWORK_ENGINE) => {
    // With Cowork off, a routine runs on the connected core instead.
    if (engine === COWORK_ENGINE && COWORK_ENABLED) {
      if (!initial) await connect();
      return { owner: coworkSessions, coreId: COWORK_ENGINE, models: initial?.models ?? [], hints: true, autoReview: false };
    }
    const owner = client;
    await owner.start();
    if (owner !== client) throw new Error("The core connection changed. Try again.");
    return { owner, coreId: coreForEngine(owner.serverInfo?.engine).id, models: initial?.models ?? [],
      hints: owner.serverInfo?.capabilities?.permissionHints === true, autoReview: await autoReviewFeature(owner),
      // R4g-routines RT3: a Code task starts like a Code session (main.jsx: no developerInstructions on a core with customization).
      customization: coreSupports(owner.serverInfo, "customization") };
  };
  // R4g-routines RT3: the host turn-error model classifies a Code task’s core RPC failure ([ccdErrorCategory:…]); a build
  // without it (packaged src/ whitelist) leaves those failures unclassified (the generic startFailed toast).
  const routineTurnErrors = await import("../src/turn-error-model.mjs").catch(() => null);
  localRoutines = createLocalRoutines({
    getState: () => config.localRoutines,
    commit: rows => { config.localRoutines = rows; save(); emit({ kind: 'local-routines' }); },
    dataDir: app.getPath('userData'), approveFolder: workspaceQueryRoot,
    // R4i-routines RI2: a new Code task captures on the connected core (null engine), never on Cowork's.
    captureOptions: async (execution, previous, kind) => captureRoutineOptions({ config,
      ...await routineContext(previous?.coreId ?? (kind === 'code' ? null : COWORK_ENGINE)), execution, previous }),
    launch: createRoutineRunner({ context: routineContext, rpc: (request, owner) => requestRpc(request, undefined, owner),
      // R4g-routines RT3 (WI-3): a Code task’s worktree is prepare-worktree’s; its session records the task (scheduledTaskId).
      prepareWorktree: prepareWorktreeInMain, turnErrorCategory: routineTurnErrors?.turnErrorCategory,
      setSessionMetadata: (id, patch) => {
        if (!config.threadIds.includes(id)) return;
        config.sessionMetadata[id] = { ...config.sessionMetadata[id], ...patch };
        config.sidebarRevision = (config.sidebarRevision || 0) + 1;
        save(); emit({ kind: "sidebar-state", state: sidebarSnapshot() });
      } }),
  });
  const { createRoutineApprovals } = await import('./routine-approvals.mjs');
  routineApprovals = createRoutineApprovals({ routines: localRoutines,
    metadata: id => config.sessionMetadata?.[id], root: id => config.threadMetadata?.[id]?.cwd });
  const { createSavedEnvironments, takeSavedEnvironment } = await import('./saved-environments.mjs');
  const savedEnvironments = createSavedEnvironments({
    file: path.join(app.getPath('userData'), 'saved-environments.json'), emit,
    approveFolder: async dir => {
      workspaceQueryRoot(dir);
      if (!(await fs.promises.stat(dir).catch(() => null))?.isDirectory()) throw new Error('That folder no longer exists.');
    },
    onSelectFolders: async folders => {
      await fileSearch.cancelAll();
      for (const dir of folders) approvedWorkspaceRoots.add(dir);
      config.cwd = folders[0]; save();
    },
  });
  // These roots were approved when the environment was saved. Restore them so
  // an edited environment can query its repository after an application restart.
  for (const row of (await savedEnvironments.run({ op: 'list' }).catch(error => { console.warn(error.message); return { environments: [] }; })).environments)
    for (const dir of [row.target.cwd, ...(row.target.additionalFolders ?? [])]) approvedWorkspaceRoots.add(dir);
  localRoutines.start();
  // Settings › Storage › Clean up inactive sessions (code-cleanup.cjs; 2.31226.0 DeviceStorage previewCodeCleanup /
  // runCodeCleanup / cancelCodeCleanup). A session goes through the app's own thread/delete, so every window's
  // session list follows; worktrees go with git as Remove unused worktrees does.
  codeCleanup = createCodeCleanup({
    getConfig: () => config, save, connected: () => !!client?.serverInfo,
    readThread: (id) => client.request("thread/read", { threadId: id, includeTurns: false }),
    // A workflow the session launched keeps working in its folder after the turn ends (workflow-service.cjs runs).
    inUse: async (id) => sessionOperations.isActive?.(id) === true || windowRegistry.windowsHolding(id).length > 0
      || await Promise.resolve(workflowService?.list?.(id)).then((runs) => (runs ?? []).some((run) => run?.status === "running"), () => true),
    isCowork: (id) => config.sessionMetadata?.[id]?.surface === "cowork" || coworkSessions.owns(id),
    worktreeStatus: (dir) => worktrees.worktreeStatus(run, dir), removeWorktree: (dir) => worktrees.removeWorktree(run, dir),
    forgetWorktree: worktrees.forgetWorktree, directoryUsage,
    deleteSession: (id) => requestRpc({ method: "thread/delete", params: { threadId: id } }, undefined, client),
    onProgress: (done, total) => emit({ kind: "code-cleanup-progress", done, total }),
  });
  // Shared by interactive messages and durable local scheduled tasks.
  async function requestRpc(p, sender, expectedOwner) {
        const expectedConnection = p.expected ? client.connection : null;
        const assertExpectedConnection = () => {
          if (p.expected && (client.connection !== expectedConnection || !connectionMatches(client, p.expected)))
            throw new Error('The core connection changed. Reopen the session before retrying.');
        };
        assertExpectedConnection();
        if (deprecated.has(p.method)) throw new Error(deprecated.get(p.method));
        if (!allowed.has(p.method) || deprecated.has(p.method)) throw new Error("Unsupported operation.");
        const coworkRoute = (p.method === 'thread/start' && p.params?.codeDesktop?.surface === 'cowork' && (!expectedOwner || expectedOwner === coworkSessions)) || coworkSessions.owns(p.params?.threadId);
        if (coworkRoute) {
          if (expectedOwner && expectedOwner !== coworkSessions) throw new Error('The Cowork session belongs to a different runtime.');
          return requestCowork(p);
        }
        if (expectedOwner && expectedOwner !== client) throw new Error("The core connection changed. Try again.");
        await client.start();
        assertExpectedConnection();
        if (expectedOwner && expectedOwner !== client) throw new Error("The core connection changed. Try again.");
        const params = { ...(p.params || {}), ...(p.params?.codeDesktop ? { codeDesktop: { ...p.params.codeDesktop } } : {}) };
        const { takeSurface } = await import('./surface-policy.mjs');
        const requestedSurface = takeSurface(params);
        const { applyProjectContext } = await import('./local-projects.mjs');
        const requestedProject = applyProjectContext(config, p.method, params, requestedSurface);
        const requestedEnvironment = await takeSavedEnvironment(params, { method: p.method, surface: requestedSurface,
          getEnvironment: id => savedEnvironments.run({ op: 'get', id }), worktreeOrigins: config.worktreeOrigins });
        // The renderer's per-turn workflow facts (Mode, the "ultracode" keyword, ultracode mode) never reach a core:
        // taken here, used once the request is otherwise ready (workflow-tool-service.cjs turnStart).
        let workflowTurn = null;
        if (params.codeDesktop && typeof params.codeDesktop === "object" && Object.hasOwn(params.codeDesktop, "workflowTurn")) {
          const { workflowTurn: taken, ...rest } = params.codeDesktop;
          workflowTurn = taken && typeof taken === "object" && ["turn/start", "thread/queue/add"].includes(p.method) ? { permission: taken.permission, mode: taken.mode, keyword: taken.keyword === true, ultracode: taken.ultracode === true } : null;
          if (Object.keys(rest).length) params.codeDesktop = rest; else delete params.codeDesktop;
        }
        // A queued message the core starts as a turn by itself never passes turn/start here: the "ultracode" keyword's
        // reminder goes with it now, as the composer promised ("Dynamic workflow requested for this turn").
        if (p.method === "thread/queue/add" && workflowTurn?.keyword && workflowToolService && Array.isArray(params.input) && typeof params.threadId === "string" && config.threadIds.includes(params.threadId))
          params.input = await workflowToolService.keywordInput(params.input);
        // Multi-window: the connection is shared, so a session another window still shows stays subscribed when this
        // window leaves it (the other split side of this window is checked by its renderer).
        if (p.method === "thread/unsubscribe" && typeof params.threadId === "string"
          && windowRegistry.windowsHolding(params.threadId).some((window) => window !== windowRegistry.windowForSender(sender))) return {};
        if (p.method === "account/rateLimitResetCredit/consume") {
          const key = params.idempotencyKey, credit = params.creditId;
          if (typeof key !== "string" || !/^[A-Za-z0-9-]{8,128}$/.test(key) || (credit != null && (typeof credit !== "string" || !credit.trim() || credit.length > 512))) throw new Error("Unsupported operation.");
          return client.request(p.method, { idempotencyKey: key, ...(credit != null ? { creditId: credit } : {}) });
        }
        if (p.method === "feedback/upload") {
          if (!["bug", "bad_result", "good_result", "safety_check", "other"].includes(params.classification)) throw new Error("Unsupported operation.");
          if (params.reason != null && (typeof params.reason !== "string" || params.reason.length > 4000)) throw new Error("Unsupported operation.");
          if (params.threadId != null && (typeof params.threadId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(params.threadId))) throw new Error("Unknown session.");
          return client.request(p.method, { classification: params.classification, reason: params.reason?.trim() || null, threadId: params.threadId ?? null, includeLogs: params.includeLogs === true });
        }
        if (p.method.startsWith("codeDesktop/messageFeedback/")) {
          return client.request(p.method, messageFeedbackParams(p.method, params, client.serverInfo, [...config.threadIds, ...config.archivedThreadIds]));
        }
        if (p.method === "account/sendAddCreditsNudgeEmail") {
          if (!["credits", "usage_limit"].includes(params.creditType)) throw new Error("Unsupported operation.");
          return client.request(p.method, { creditType: params.creditType });
        }
        if (["thread/start","thread/resume","turn/start"].includes(p.method) && Object.hasOwn(params,"serviceTier")) {
          params.serviceTier = validateServiceTier(initial?.models || [], params.model || config.model, params.serviceTier);
        }
        if (["thread/start", "thread/resume", "turn/start", "codeDesktop/thread/permissions", "codeDesktop/commands/execute"].includes(p.method)) {
          const owner = client;
          await validateBypassRequest(params, () => config, () => owner.request("configRequirements/read", {}));
          if (owner !== client) throw coreError(owner, "The {core} connection changed. Try again.");
        }
        // The DeepSeek bridge shows the model its `workflow` tool only while Dynamic workflows is on
        // (harness structured.js workflowsAllowedBy); the setting lives here, so it is stamped here.
        if (["thread/start", "thread/resume", "turn/start", "codeDesktop/thread/permissions", "codeDesktop/commands/execute"].includes(p.method) && params.codeDesktop && typeof params.codeDesktop === "object") {
          // Settings › Code › Dynamic workflows › Workflow engine: the core's own workflow tool only while its own engine is chosen.
          const workflowsOn = workflowSettings().enabled;
          // dynamicWorkflows false: the bridge withholds its own workflow tool (off, or OpenClaude Desktop's engine chosen).
          params.codeDesktop = { ...params.codeDesktop, dynamicWorkflows: workflowsOn && currentWorkflowEngine() === "native" };
        }
        if (["codeDesktop/workflow/stop", "codeDesktop/workflow/member", "codeDesktop/workflow/pause", "codeDesktop/workflow/resume", "codeDesktop/workflow/artifact", "codeDesktop/workflow/settings"].includes(p.method) && (typeof params.threadId !== "string" || !config.threadIds.includes(params.threadId))) throw new Error("Unknown session.");
        if (p.method === "codeDesktop/sideQuestion" && (typeof params.threadId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(params.threadId))) throw new Error("Unknown session.");
        if (p.method === "codeDesktop/sideQuestion" && nativeSideQuestions()) return nativeSideChat.ask(params);
        if (p.method === "codeDesktop/sideQuestion/cancel" && nativeSideQuestions()) return nativeSideChat.cancel(params);
        if (p.method.startsWith("remoteControl/")) {
          if (coreForEngine(client?.serverInfo?.engine).kind !== "native") throw new Error("Unsupported operation.");
          const text = (value, max = 512) => typeof value === "string" && value && value.length <= max && !/[\u0000-\u001f]/.test(value) ? value : null;
          switch (p.method) {
            case "remoteControl/status/read": return client.request(p.method, undefined);
            case "remoteControl/enable": case "remoteControl/disable": return client.request(p.method, {});
            case "remoteControl/pairing/start": return client.request(p.method, { ...(params.manualCode === true ? { manualCode: true } : {}) });
            case "remoteControl/pairing/status": {
              const pairingCode = text(params.pairingCode), manualPairingCode = text(params.manualPairingCode);
              if (!pairingCode && !manualPairingCode) throw new Error("Unsupported operation.");
              return client.request(p.method, { pairingCode, manualPairingCode });
            }
            case "remoteControl/client/list": {
              const environmentId = text(params.environmentId);
              if (!environmentId) throw new Error("Unsupported operation.");
              return client.request(p.method, { environmentId, limit: 100, order: "desc" });
            }
            case "remoteControl/client/revoke": {
              const environmentId = text(params.environmentId), clientId = text(params.clientId);
              if (!environmentId || !clientId) throw new Error("Unsupported operation.");
              return client.request(p.method, { environmentId, clientId });
            }
          }
        }
        if (p.method === "codeDesktop/thread/share") {
          if (client.serverInfo?.capabilities?.threadShare !== true) throw new Error("Unsupported operation.");
          if (typeof params.threadId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(params.threadId) || typeof params.enabled !== "boolean") throw new Error("Unknown session.");
          return client.request(p.method, { threadId: params.threadId, enabled: params.enabled });
        }
        if (p.method === "codeDesktop/thread/move") {
          if (client.serverInfo?.capabilities?.moveCwd !== true) throw new Error("Unsupported operation.");
          if (typeof params.threadId !== "string" || !config.threadIds.includes(params.threadId)) throw new Error("Unknown session.");
          if (params.check === true) return client.request(p.method, { threadId: params.threadId, check: true });
          if (typeof params.cwd !== "string" || !params.cwd.trim() || params.cwd.length > 4096 || params.cwd.includes("\0")) throw new Error("Name a folder: /cd <path>.");
          return client.request(p.method, { threadId: params.threadId, cwd: params.cwd, moveChanges: params.moveChanges === true }, 5 * 60 * 1000);
        }
        if (p.method === "codeDesktop/turn/continue") {
          if (client.serverInfo?.capabilities?.continueTurn !== true) throw new Error("Unsupported operation.");
          if (typeof params.threadId !== "string" || !config.threadIds.includes(params.threadId)) throw new Error("Unknown session.");
          return client.request(p.method, { threadId: params.threadId });
        }
        if (p.method === "codeDesktop/migration/read" || p.method === "codeDesktop/migration/run") {
          if (client.serverInfo?.capabilities?.legacyMigration !== true) throw new Error("Unsupported operation.");
          return client.request(p.method, p.method === "codeDesktop/migration/run" ? { configOnly: params.configOnly === true } : {}, 11 * 60 * 1000);
        }
        if (p.method === "codeDesktop/threadTitle") {
          if (typeof params.threadId !== "string" || !config.threadIds.includes(params.threadId)) throw new Error("Unknown session.");
          if (coreForEngine(client?.serverInfo?.engine).kind !== "native") throw new Error("Unsupported operation.");
          const text = typeof params.text === "string" ? params.text.slice(0, 4000) : "";
          return nativeThreadTitles.generate({ text, cwd: typeof params.cwd === "string" && path.isAbsolute(params.cwd) ? params.cwd : undefined,
            model: typeof params.model === "string" && params.model.length <= 200 ? params.model : undefined });
        }
        if (p.method === "codeDesktop/commands/execute" && (typeof params.threadId !== "string" || !config.threadIds.includes(params.threadId))) throw new Error("Unknown session.");
        if (p.method === "codeDesktop/settings/write") {
          if (typeof params.ns !== "string" || !/^[a-z0-9-]{1,64}$/.test(params.ns) || typeof params.key !== "string" || !/^[A-Za-z0-9]{1,64}$/.test(params.key)) throw new Error("Unsupported operation.");
          if (params.value !== null && !Number.isSafeInteger(params.value) && (typeof params.value !== "string" || params.value.length > 512)) throw new Error("Unsupported operation.");
          return client.request(p.method, { ns: params.ns, key: params.key, value: params.value });
        }
        if (p.method === "codeDesktop/settings/read") return client.request(p.method, {});
        if (p.method === "thread/shellCommand") {
          if (typeof params.threadId !== "string" || !config.threadIds.includes(params.threadId)) throw new Error("Unknown session.");
          if (typeof params.command !== "string" || !params.command.trim() || params.command.length > 16000 || params.command.includes("\0")) throw new Error("Enter a command.");
          return client.request(p.method, { threadId: params.threadId, command: params.command.trim() });
        }
        if (p.method === "thread/approveGuardianDeniedAction") {
          if (typeof params.threadId !== "string" || !config.threadIds.includes(params.threadId)) throw new Error("Unknown session.");
          const event = params.event;
          if (!event || typeof event !== "object" || Array.isArray(event) || typeof event.id !== "string" || !event.id || event.status !== "denied"
            || !event.action || typeof event.action !== "object" || typeof event.action.type !== "string" || JSON.stringify(event).length > 65536) throw new Error("Unsupported operation.");
          return client.request(p.method, { threadId: params.threadId, event });
        }
        if (p.method.startsWith("thread/goal/")) {
          if (typeof params.threadId !== "string" || !config.threadIds.includes(params.threadId)) throw new Error("Unknown session.");
          if (p.method === "thread/goal/set") {
            if (Object.keys(params).some((key) => !["threadId", "objective", "status", "tokenBudget", "codeDesktop"].includes(key))) throw new Error("Unsupported operation.");
            // codeDesktop {edit: true} (/goal edit): change the current goal's objective in place. A bridge core reads it;
            // a native core (Codex) gets the objective with the goal's own status, which edits the goal there.
            if (params.codeDesktop !== undefined && (JSON.stringify(params.codeDesktop) !== JSON.stringify({ edit: true }) || typeof params.objective !== "string")) throw new Error("Unsupported operation.");
            if (params.codeDesktop !== undefined && client.serverInfo?.capabilities?.permissionHints !== true) delete params.codeDesktop;
            if (params.objective !== undefined && params.objective !== null && (typeof params.objective !== "string" || !params.objective.trim() || params.objective.length > 4000)) throw new Error("Enter a goal.");
            if (params.status !== undefined && params.status !== null && !["active", "paused"].includes(params.status)) throw new Error("Unsupported operation.");
            if (params.tokenBudget !== undefined && params.tokenBudget !== null && (!Number.isSafeInteger(params.tokenBudget) || params.tokenBudget <= 0)) throw new Error("Unsupported operation.");
          }
        }
        if (p.method === "codeDesktop/commands/execute" && (typeof params.command !== "string" || !params.command.trim())) throw new Error("Unsupported operation.");
        if (p.method === "codeDesktop/commands/list" && params.threadId !== undefined && (typeof params.threadId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(params.threadId))) throw new Error("Unknown session.");
        // A core with capabilities.toolSelection (the DeepSeek bridge, harness tool-gate.js) gets the session's
        // turned-off tools: thread/start carries the renderer's choice (else the default profile's), and
        // thread/resume / turn/start the saved one unless the request names its own.
        // thread/goal/set and codeDesktop/commands/execute start goal rounds on the agent, so they carry the saved
        // selection as well: tools turned off since the last message stay off in every unattended round.
        if (["thread/start", "thread/resume", "turn/start", "thread/goal/set", "codeDesktop/commands/execute"].includes(p.method) && client.serverInfo?.capabilities?.toolSelection === true) {
          const hint = params.codeDesktop && typeof params.codeDesktop === "object" ? params.codeDesktop : {};
          const tools = Object.hasOwn(hint, "tools") ? normalizeSelection(hint.tools)
            : p.method === "thread/start" ? defaultProfile(config)?.tools ?? null : normalizeSelection(config.threadTools[params.threadId]);
          params.codeDesktop = { ...hint, tools };
        }
        modelSettings.decorate(p.method, params);
        decorateAgentTools(p.method, params);
        // The Codex core (native, no permission hints): Settings › Code › Web search and Response style. web_search is
        // a thread config override (thread/start|resume config); personality goes on thread and turn requests, only
        // for a model that reports supportsPersonality.
        if (["thread/start", "thread/resume", "turn/start"].includes(p.method) && coreForEngine(client.serverInfo?.engine).id === "codex" && client.serverInfo?.capabilities?.permissionHints !== true) {
          const search = ["disabled", "cached", "live"].includes(config.codexWebSearch) ? config.codexWebSearch : null;
          if (search && p.method !== "turn/start") params.config = { ...(params.config && typeof params.config === "object" ? params.config : {}), web_search: search };
          const style = ["none", "friendly", "pragmatic"].includes(config.codexPersonality) ? config.codexPersonality : null;
          const modelId = typeof params.model === "string" && params.model ? params.model : config.model;
          const model = (initial?.models || []).find((entry) => entry.model === modelId || entry.id === modelId);
          if (style && model?.supportsPersonality === true && !Object.hasOwn(params, "personality")) params.personality = style;
          // Codex's own permission settings (codex-permissions.mjs): a chosen or configured custom profile replaces
          // the workspace-write sandbox of Auto / Manual / Accept edits; without one, config.toml's
          // [sandbox_workspace_write] writable roots and network access are kept.
          const owner = client, cwd = typeof params.cwd === "string" && params.cwd ? params.cwd : config.cwd || null;
          const codexConfig = await owner.request("config/read", { includeLayers: false, cwd }, 5000).then((result) => result?.config ?? null, () => null);
          if (owner !== client) throw coreError(owner, "The {core} connection changed. Try again.");
          applyCodexPermissions(p.method, params, { profile: effectiveProfile(config.codexPermissionProfile, codexConfig?.default_permissions), workspaceWrite: codexConfig?.sandbox_workspace_write ?? null });
          // The session's web search, for WebFetch (agentToolServedToCore): the override above, else config.toml's.
          if (p.method !== "turn/start") {
            const effective = typeof params.config?.web_search === "string" ? params.config.web_search : typeof codexConfig?.web_search === "string" ? codexConfig.web_search : null;
            if (effective) rememberCodexWebSearch(params.config?.[AGENT_SESSION_KEY], effective);
          }
        }
        // A core without permission hints gets the app's Mode as its own collaboration mode (permission-policy.mjs
        // turnPermissionParams): completed with the turn's model and effort where the core lists collaboration
        // modes, dropped where it doesn't (an unknown field must never reach it).
        if (p.method === "turn/start" && Object.hasOwn(params, "collaborationMode")) {
          const owner = client, supported = await collaborationModes(owner);
          if (owner !== client) throw coreError(owner, "The {core} connection changed. Try again.");
          const models = initial?.models || [], fallback = models.find((model) => model.isDefault) ?? models[0];
          // Plan reasons at the core's own Plan effort (plan_mode_reasoning_effort, else its Plan preset), never the everyday one.
          const planEffort = supported && params.collaborationMode?.mode === "plan" ? await planModeEffort(owner, typeof params.cwd === "string" ? params.cwd : null) : undefined;
          if (owner !== client) throw coreError(owner, "The {core} connection changed. Try again.");
          const native = supported ? nativeCollaborationMode(params, { model: config.model || fallback?.model || fallback?.id || null, effort: config.effort, planEffort }) : null;
          if (native) params.collaborationMode = native; else delete params.collaborationMode;
        }
        if (p.method === "turn/start") {
          config.stats[params.threadId] ??= { messages: 0, ids: [] };
          config.stats[params.threadId].model = params.model;
        }
        instructionsService.decorate(p.method, params);
        // Approvals go to the user, except Codex's auto-review ('Approve for me', the renderer's Auto on a core that
        // has it): kept only where this connection reported the feature and approvals can happen at all.
        if (["thread/start", "thread/resume", "turn/start"].includes(p.method)) {
          const owner = client;
          const auto = params.approvalsReviewer === "auto_review" && (params.approvalPolicy ?? "on-request") === "on-request"
            && params.sandbox !== "danger-full-access" && params.sandboxPolicy?.type !== "dangerFullAccess" && await autoReviewFeature(owner);
          if (owner !== client) throw coreError(owner, "The {core} connection changed. Try again.");
          if (auto) params.approvalsReviewer = "auto_review";
          else if (p.method !== "turn/start" || Object.hasOwn(params, "approvalsReviewer")) params.approvalsReviewer = "user";
        }
        if (p.method === "thread/start" || p.method === "thread/resume") {
          params.approvalPolicy = params.approvalPolicy || "on-request";
        }
        if (p.method === "thread/archive") sessionOperations.assertAvailable(params.threadId);
        if (p.method === "thread/delete") {
          if (typeof params.threadId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(params.threadId)) throw new Error("Unknown session.");
          sessionOperations.assertAvailable(params.threadId);
        }
        // The Workflow tool's launch text tells the model to edit a run's saved script and re-run it with scriptPath:
        // that folder (<userData>/sessions/<id>/workflows/scripts) is writable for the session's workspace-write
        // sandbox, as the session folder is (else a sandboxed edit fails with EPERM outside Bypass).
        if (p.method === "turn/start" && params.sandboxPolicy?.type === "workspaceWrite" && Array.isArray(params.sandboxPolicy.writableRoots) && typeof params.threadId === "string" && config.threadIds.includes(params.threadId)) {
          const scripts = path.join(app.getPath("userData"), "sessions", params.threadId, "workflows", "scripts");
          if (fs.existsSync(scripts) && !params.sandboxPolicy.writableRoots.includes(scripts)) params.sandboxPolicy = { ...params.sandboxPolicy, writableRoots: [...params.sandboxPolicy.writableRoots, scripts] };
        }
        if (p.method === "turn/start" && workflowToolService && typeof params.threadId === "string" && config.threadIds.includes(params.threadId)) await workflowToolService.turnStart(params, workflowTurn ?? {});
        if (p.method === "turn/start" && turnPlanTools && typeof params.threadId === "string" && config.threadIds.includes(params.threadId)) await turnPlanTools.turnStart(params); // turn-plan: the compaction reminder
        if (expectedOwner && expectedOwner !== client) throw new Error("The core connection changed. Try again.");
        const release = p.method === "turn/start" ? sessionOperations.reserveMessage(params.threadId) : null;
        let result, confirmBtwTurn;
        const requester = client;
        try {
          confirmBtwTurn = p.method === "turn/start" ? btwSessions.prepareTurn(params, { customPrompt: instructionsService.customPromptActive(), permission: workflowTurn?.permission }) : null;
          assertExpectedConnection();
          result = await requester.request(p.method, params, 120000, expectedConnection ?? undefined);
        }
        catch (error) {
          if (p.method === "turn/start") workflowToolService?.turnFailed(params.threadId);
          // A per-token account (an API key, or a custom endpoint with no sign-in) has no plan limits or account
          // usage: a native core's auth-required refusal becomes the empty state the Usage page explains, not a raw
          // error. Only that refusal (account-operations perTokenRefusal): every other error still comes through.
          const empty = requester === client ? perTokenRefusal(p.method, error, { serverInfo: requester.serverInfo, account: accountOperations.accountSnapshot() }) : null;
          if (empty) return empty;
          // ipcRenderer.invoke keeps only the message of a thrown error, so a
          // JSON-RPC error from the core (numeric code) is returned whole and
          // rethrown by rpcResult (src/rpc-error.mjs) with its code and data
          // (CodexErrorInfo such as activeTurnNotSteerable).
          if (typeof error?.code === "number")
            return { __codeDesktopRpcError: { message: error.message, code: error.code, data: error.data ?? null } };
          throw error;
        }
        finally { release?.(); }
        // The core already accepted the turn. A metadata write failure must
        // never present it as a rejected send and invite a duplicate retry.
        try { confirmBtwTurn?.(result); } catch (error) { console.warn('Side session turn metadata:', error.message); }
        if (p.method === "thread/start") {
          bindAgentTools(params, result.thread);
          if (requestedEnvironment) {
            config.sessionMetadata[result.thread.id] = { ...config.sessionMetadata[result.thread.id], environmentId: requestedEnvironment.id };
            // A successful start must not become a failed send if a concurrent
            // window removed the preset while the core was starting the thread.
            await savedEnvironments.run({ op: 'used', id: requestedEnvironment.id }).catch(error => console.warn('Environment recency:', error.message));
          }
          if (requestedSurface) {
            const project = requestedProject;
            config.sessionMetadata[result.thread.id] = { ...config.sessionMetadata[result.thread.id], surface: requestedSurface, ...(project ? { projectId: project.id } : {}) };
          }
          config.threadIds = [
            ...new Set([result.thread.id, ...config.threadIds]),
          ];
          config.stats[result.thread.id] = { messages: 0, tokens: 0, observedTokens: 0, observedUsage: { input: 0, output: 0, cached: 0, cacheWrite: 0 }, ids: [] };
          const tools = normalizeSelection(params.codeDesktop?.tools);
          if (tools) config.threadTools[result.thread.id] = tools;
          save();
        }
        if (result.thread && (config.threadIds.includes(result.thread.id) || config.archivedThreadIds.includes(result.thread.id))) {
          const { turns, ...metadata } = result.thread;
          config.threadMetadata[result.thread.id] = metadata;
          for (const turn of turns ?? []) for (const item of turn.items ?? []) artifactIndex.recordArtifactItem(config, result.thread.id, item, (turn.completedAt ?? metadata.updatedAt ?? Date.now() / 1000) * 1000);
          if (typeof metadata.cwd === "string") observedThreadCwds.add(metadata.cwd);
          // A session started inside a prepared worktree remembers its creation base.
          const base = p.method === "thread/start" && typeof metadata.cwd === "string" ? config.worktreeBases[metadata.cwd] : undefined;
          if (base && !config.sessionMetadata[result.thread.id]?.baseBranch)
            config.sessionMetadata[result.thread.id] = { ...config.sessionMetadata[result.thread.id], baseBranch: base };
          // ...and the repository the worktree was cut from (getAll originCwd for the Recent folders list).
          const originCwd = p.method === "thread/start" && typeof metadata.cwd === "string" ? config.worktreeOrigins?.[metadata.cwd] : undefined;
          if (typeof originCwd === "string" && originCwd && !config.sessionMetadata[result.thread.id]?.originCwd)
            config.sessionMetadata[result.thread.id] = { ...config.sessionMetadata[result.thread.id], originCwd };
          save();
        }
        if (p.method === "thread/list" && Array.isArray(result?.data))
          for (const thread of result.data) if (typeof thread?.cwd === "string") observedThreadCwds.add(thread.cwd);
        if (p.method === "thread/name/set" && config.threadMetadata[params.threadId]) {
          config.threadMetadata[params.threadId].name = params.name;
          save();
        }
        if (p.method === "thread/archive") {
          agentTools.cancelSession(params.threadId, "The session was archived.");
          // Its monitors and scheduled prompts end with it (agent-tools/monitor.mjs, schedule.mjs).
          monitorService.stopSession(params.threadId);
          scheduleService.removeSession(params.threadId);
          config.threadIds = config.threadIds.filter((id) => id !== params.threadId);
          config.archivedThreadIds = [...new Set([params.threadId, ...config.archivedThreadIds])];
          save();
          // R4g-btw BT3 (X7-14): c6b8adeaf evicts an archived session (evictEpitaxySession → closeSidePanePopoutsForSession)
          // only once nothing holds it (`refCount===0`), checked once on idle and never again; a side-pane popout holds its
          // session itself (c5638815a PopoutEpitaxyPaneContent `ve(k)` = c5da7eb42 lF → openSession), so locally the pane
          // windows and the reported /btw children count as holders too (R4g fix).
          if (!windowRegistry.windowsShowing(params.threadId, { panes: true, side: true }).length) closeSidePanePopoutsForSession(params.threadId);
          // R2-btw (NBS-7): settled /btw children go with their parent (2.42304.0 archiveCascadeOf, btw-sessions.cjs).
          // R3-nested: in the original order (CFJssAFf teardownSession) the parent's "archived" event goes out first, and
          // the answer waits for the cascade only while the parent has live side sessions or openings in flight.
          await archiveParentCascade({ threadId: params.threadId, owner: requester, emitSessionList, btwSessions });
        }
        if (p.method === "thread/unarchive") {
          config.archivedThreadIds = config.archivedThreadIds.filter((id) => id !== params.threadId);
          config.threadIds = [...new Set([params.threadId, ...config.threadIds])];
          // A restore restarts the inactivity window; otherwise the next sweep
          // re-archives a long-idle session the user just brought back.
          config.restoredAt = { ...config.restoredAt, [params.threadId]: Date.now() };
          save();
        }
        if (p.method === "thread/delete") {
          const id = params.threadId;
          monitorService.stopSession(id);
          scheduleService.removeSession(id);
          config.threadIds = config.threadIds.filter((known) => known !== id);
          config.archivedThreadIds = config.archivedThreadIds.filter((known) => known !== id);
          delete config.threadMetadata[id];
          delete config.sessionMetadata[id];
          if (config.stats) delete config.stats[id];
          if (config.restoredAt) delete config.restoredAt[id];
          delete config.threadTools[id];
          config.pinnedOrder = (config.pinnedOrder || []).filter((known) => known !== id);
          config.sidebarRevision = (config.sidebarRevision || 0) + 1;
          save();
          // R4g-btw BT3 (X7-14): a deleted session is always evicted (c6b8adeaf delete → evictEpitaxySession).
          closeSidePanePopoutsForSession(id);
        }
        // The other windows (and the other split side) follow the session list (main.jsx "session-list").
        if (p.method === "thread/start" && result?.thread?.id) emitSessionList("added", result.thread);
        else if (p.method === "thread/name/set" && typeof params.threadId === "string" && typeof params.name === "string") emit({ kind: "session-list", op: "renamed", threadId: params.threadId, name: params.name });
        else if (p.method === "thread/unarchive") emitSessionList("unarchived", params.threadId); // R3-nested: "archived" goes out before the /btw cascade above.
        else if (p.method === "thread/delete") emitSessionList("deleted", params.threadId);
        return result;
  }
  ipcMain.handle("desktop:call", async (e, action, p = {}) => {
    const senderKind = validSender(e, action);
    // The Preview pane (preview-service.cjs validates each action; the sender is the pane's own window).
    if (typeof action === "string" && action.startsWith("preview-")) {
      if (!previewService) throw new Error("The preview isn’t ready yet.");
      // Settings › Code › Browser › Keep cookies reads and sets the app-wide storage mode with no session (B23 review).
      // So do Allowed sites (B39: the pane menu's and Settings' "Manage allowed sites…" dialog).
      const sessionless = ((action === "preview-storage-read" || action === "preview-storage") && p?.sessionId === undefined)
        || ["preview-allowed-origins", "preview-allowed-origin-add", "preview-allowed-origin-remove", "preview-allowed-origins-clear"].includes(action);
      // The New session page's browser is owned by its folder ("home:<folder>", one the app already trusts).
      if (!sessionless && (typeof p?.sessionId !== "string" || !(agentToolSession(p.sessionId) ?? previewHomeOwner(p.sessionId)))) throw new Error("Unknown session.");
      return previewService.call(e.sender, action, p);
    }
    // The Background tasks pane's Monitor and scheduled-prompt rows (monitor-service.cjs, schedule-service.cjs).
    if (["monitor-state", "monitor-stop", "schedule-state", "schedule-stop"].includes(action)) {
      if (typeof p?.sessionId !== "string" || !agentToolSession(p.sessionId)) throw new Error("Unknown session.");
      if (action === "monitor-state") return monitorService.list(p.sessionId);
      if (action === "schedule-state") return scheduleService.list(p.sessionId);
      if (typeof p.id !== "string" || !p.id) throw new Error("Unknown task.");
      if (action === "monitor-stop") return monitorService.stop(p.sessionId, p.id, { by: "user" });
      return { stopped: scheduleService.remove(p.sessionId, p.id) };
    }
    // R4g-mcp MA-4: MCP App widgets' resource reads, App servers and sandbox origin (electron/mcp-apps-host.cjs).
    if (typeof action === "string" && action.startsWith("mcp-app:")) return mcpAppsHost.call(action, p);
    // turn-plan: cccc2cf0a rT / iT → LocalSessions.setAvailableNextActions (what wrap_up may offer as app actions).
    if (action === "turn-plan:available-next-actions") {
      if (typeof p?.sessionId !== "string" || !agentToolSession(p.sessionId)) throw new Error("Unknown session.");
      return turnPlanTools?.setAvailableNextActions(p.sessionId, p.actions ?? undefined) ?? false;
    }
    switch (action) {
      case "popout-open": return openPopout(p, windowRegistry.windowForSender(e.sender) ?? win);
      // Multi-window and split view (window-registry.cjs): a new window (empty, or showing a session), this window's
      // layout (its primary session and split side: menus, notification routing and relaunch follow it) and its View ›
      // Split View state.
      case "window-open": {
        const sessionId = p.sessionId == null ? null : p.sessionId;
        if (sessionId !== null && (typeof sessionId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(sessionId))) throw new Error("Unknown session.");
        // position {x, y} (screen points): a row torn off the sidebar (source-sidebar-drag.jsx) opens its window there.
        const position = p.position && Number.isFinite(p.position.x) && Number.isFinite(p.position.y) && Math.abs(p.position.x) < 1e6 && Math.abs(p.position.y) < 1e6
          ? { x: Math.round(p.position.x), y: Math.round(p.position.y) } : null;
        // B27: Open in › New window, ⌘-click and a sidebar tear-off open the session in a session popout (shared-21
        // $ce / te / shared-22 drag_tear_off → openPopout {type: "code-session"}); no session: a new-session draft popout.
        return openSessionPopout({ sessionId, from: windowRegistry.windowForSender(e.sender) ?? win, position });
      }
      // B27 session popout header (shared-18 yx/hx): Open in main window shows the popout's session (or, for a draft, the
      // new-session page) in the full window focused last and closes the popout; Keep window on top pins it.
      case "session-popout-state": {
        const window = windowRegistry.windowForSender(e.sender);
        if (!windowRegistry.isSessionPopout(window)) throw new Error("Not a session window.");
        return { alwaysOnTop: windowRegistry.getState(window, "alwaysOnTop") === true };
      }
      case "session-popout-pin": {
        const window = windowRegistry.windowForSender(e.sender);
        if (!windowRegistry.isSessionPopout(window)) throw new Error("Not a session window.");
        const value = p?.value === true;
        window.setAlwaysOnTop(value);
        return windowRegistry.setState(window, "alwaysOnTop", value);
      }
      case "session-popout-dock": {
        const window = windowRegistry.windowForSender(e.sender);
        if (!windowRegistry.isSessionPopout(window)) throw new Error("Not a session window.");
        const sessionId = windowRegistry.layoutOf(window).current;
        const target = await dockTargetWindow();
        if (!target) return false;
        const navigateTarget = () => { if (liveContents(target)) { windowRegistry.send(target, { kind: "desktop-navigate", threadId: sessionId ?? null }); showWindow(target); } };
        // A window just created navigates once its renderer has loaded (init restores its layout first).
        if (target.webContents.isLoading()) target.webContents.once("did-finish-load", () => setTimeout(navigateTarget, 300)); else navigateTarget();
        if (!window.isDestroyed()) window.close();
        return true;
      }
      case "window-layout": return windowRegistry.setLayout(windowRegistry.windowForSender(e.sender), p);
      // R4g-btw BT3 (X7-14): the /btw children this window's session tiles show (src/btw-read-state.mjs), counted by the
      // automatic unread check below.
      case "window-side-sessions": return windowRegistry.setSideSessions(windowRegistry.windowForSender(e.sender), p?.sessions);
      // R4f-popout F3 (layout-04, src/popout-r4f-relay.mjs): a pane window's Add to prompt over a draft asks whether
      // this window is on screen, and off screen brings it forward (2.42304.0 te.getOnScreen, Le = Jk show + focus).
      case "window-on-screen": return windowOnScreen(windowRegistry.windowForSender(e.sender));
      case "window-raise": return raiseWindow(windowRegistry.windowForSender(e.sender));
      case "split-menu-state": return setSplitMenuState(p, windowRegistry.windowForSender(e.sender));
      case "popout-dock":
        return require("./popout-dock-r4h.cjs").dockPopoutWindow({
          sender: e.sender, senderKind, params: p, popoutForSender, popouts, popoutKey, windowRegistry, showWindow,
        });
      case "popout-sync": {
        const entry = popouts.get(popoutKey(p.sessionId, p.pane));
        if (entry && !entry.window.isDestroyed()) entry.window.webContents.send("desktop:event", { kind: "popout-data", pane: p.pane, data: p.data ?? null });
        return !!entry;
      }
      case "popout-list": return popoutList();
      // B27: a window's answer to an agent layout command (runAgentLayoutCommand), from the window that was asked.
      case "layout-command-result": {
        const pending = typeof p?.requestId === "string" ? layoutRequests.get(p.requestId) : null;
        if (!pending || pending.window !== windowRegistry.windowForSender(e.sender)) return false;
        const response = p.response && typeof p.response === "object" ? p.response : { outcome: "failed", reason: "unknown_command" };
        const target = typeof p.openWindow === "string" && [...config.threadIds, ...config.archivedThreadIds].includes(p.openWindow) ? p.openWindow : null;
        if (!target) { pending.resolve(response); return true; }
        try {
          await openSessionPopout({ sessionId: target, from: pending.window, inactive: true });
          const layout = response.layout && typeof response.layout === "object" ? { ...response.layout, popoutSessionIds: [...new Set([...(response.layout.popoutSessionIds ?? []), target])] } : response.layout;
          pending.resolve({ ...response, layout });
        } catch { pending.resolve({ ...response, outcome: "failed", reason: "popout_unavailable" }); }
        return true;
      }
      // A pane window's own state, read as it loads without waiting for the core (init connects first): its Keep window
      // on top (a pinned window restored at launch shows the pin pressed; shared-18 mx/hx) and the saved appearance it
      // applies like a main window (cd377abb5 Yn mirroring; later changes arrive as config-updated).
      case "popout-state": {
        const entry = popoutForSender(e.sender);
        if (!entry || entry.window.isDestroyed()) throw new Error("Unknown pane window.");
        return { sessionId: entry.sessionId, pane: entry.pane, alwaysOnTop: entry.alwaysOnTop === true, config: sharedConfig(), ...(entry.seed ? { seed: entry.seed } : {}), ...(entry.sessionView ? { sessionView: entry.sessionView } : {}) };
      }
      // B27: the side chat window keeps its conversation here as it changes, so however the window closes the latest one
      // goes back to the window that popped it out (popout-docked data).
      case "popout-handback": {
        const entry = popoutForSender(e.sender);
        if (!entry || entry.window.isDestroyed() || entry.pane !== "side-chat") throw new Error("Unknown pane window.");
        if (p?.data && typeof p.data === "object" && JSON.stringify(p.data).length <= 2_000_000) entry.handback = p.data;
        return true;
      }
      // R4i-transcript TR3: the /btw popout's tile switched to another child of its parent (its tab strip); the entry
      // keeps the view it docks back, closes and is restored with (c5638815a bt's pane store, read back by cd377abb5 xr).
      case "popout-session-view": {
        const entry = popoutForSender(e.sender);
        if (!entry || entry.window.isDestroyed() || entry.pane !== "session") throw new Error("Unknown pane window.");
        const view = btwPopoutView(entry.sessionId, p?.sessionView);
        if (!view) return false;
        if (entry.sessionView?.sessionId !== view.sessionId || entry.sessionView?.title !== view.title) { entry.sessionView = view; broadcastPopouts(); }
        return true;
      }
      // B27: a file reference opened in an App-hosted pane window (Tasks, Terminal) opens in the window showing its
      // session, else the window that popped it out (window-registry.cjs open-file-ref route).
      case "popout-open-file": {
        const entry = popoutForSender(e.sender);
        if (!entry || entry.window.isDestroyed()) throw new Error("Unknown pane window.");
        const ref = p?.ref;
        if (!ref || typeof ref.path !== "string" || !ref.path || ref.path.length > 4096) throw new Error("Unknown file.");
        const clean = { path: ref.path, ...(Number.isInteger(ref.line) ? { line: ref.line } : {}), ...(Number.isInteger(ref.endLine) ? { endLine: ref.endLine } : {}) };
        const sent = windowRegistry.dispatch({ kind: "open-file-ref", sessionId: entry.sessionId, ref: clean, ...(entry.ownerId !== null ? { windowId: entry.ownerId } : {}) });
        return sent.length > 0;
      }
      // 'Add to prompt' in a pane window (a changed-line comment, plan comments): that window has no composer, so the
      // text goes to the main window showing the pane's session, else the window that popped it out (window-registry
      // add-to-prompt route); that window's composer takes it as a context snippet, opening the session if needed.
      case "popout-add-to-prompt": {
        const entry = popoutForSender(e.sender);
        if (!entry || entry.window.isDestroyed()) throw new Error("Unknown pane window.");
        const text = typeof p?.text === "string" ? p.text.trim() : "";
        if (!text) return false;
        const say = (source) => (i18n ? i18n.t(source) : source);
        if (text.length > 200000) throw new Error(say("That comment is too long to add to the prompt."));
        // A terminal selection keeps its tab label (B27: the Terminal pane popped out; composer-attachments-model makeSnippet).
        const meta = { ...(typeof p?.label === "string" && p.label.trim() ? { label: p.label.trim().slice(0, 200) } : {}), ...(typeof p?.terminalTabId === "string" && p.terminalTabId.length <= 200 ? { terminalTabId: p.terminalTabId } : {}) };
        const sent = windowRegistry.dispatch({ kind: "add-to-prompt", sessionId: entry.sessionId, text, ...(Object.keys(meta).length ? { meta } : {}), ...(entry.ownerId !== null ? { windowId: entry.ownerId } : {}) });
        if (!sent.length) throw new Error(say("No window is open to take the comment."));
        return true;
      }
      case "popout-always-on-top": {
        // The popped-out header's pin (sidebar-support.js:9509-9547 eE/tE ->
        // setPopoutAlwaysOnTop): only a pane window toggles itself.
        const entry = popoutForSender(e.sender);
        if (!entry || entry.window.isDestroyed()) throw new Error("Unknown pane window.");
        entry.alwaysOnTop = p.value === true;
        entry.window.setAlwaysOnTop(entry.alwaysOnTop);
        broadcastPopouts();
        return entry.alwaysOnTop;
      }
      case "init": {
        try {
          const owner = client;
          const status = initial || (await connect());
          if (owner !== client) throw coreError(owner, "The {core} connection changed. Reconnect to continue.");
          return {
            ...status,
            host: { home: os.homedir(), platform: process.platform },
            account: accountOperations.accountSnapshot(),
            config,
            fullScreen: (windowRegistry.windowForSender(e.sender) ?? win).isFullScreen(),
            zoomFactor: zoomFactorOf(windowRegistry.windowForSender(e.sender) ?? win),
            // What this window showed (relaunch, or the session it was opened for): main.jsx restores it.
            windowLayout: windowRegistry.launchLayoutOf(windowRegistry.windowForSender(e.sender)),
            approvalSnapshot: owner.approvalSnapshot(),
            sessionOperations: sessionOperations.snapshot(),
            auth: accountOperations.snapshot(),
            extensionCores: extensionPacks.descriptors(),
            // Settings › Code › Dynamic workflows: what the environment and managed settings decide (env wins).
            workflowEnv: workflowEnvFacts(), workflowManaged: managedSettings(), workflowParallelism: os.availableParallelism?.() ?? os.cpus().length,
            bypassCarry: carryFor(bypassCarry, owner.connection?.approvalConnectionId, config),
            connectionNotices,
            threadUsage: Object.fromEntries(threadUsage),
            coworkEnabled: COWORK_ENABLED,
          };
        } catch (error) {
          return {
            connected: false,
            host: { home: os.homedir(), platform: process.platform },
            error: error.message,
            extensionCores: extensionPacks.descriptors(),
            config,
            models: [],
            coworkEnabled: COWORK_ENABLED,
          };
        }
      }
      case "reconnect": {
        // Only the reconnect a core switch asked for takes the switch's token; every reconnect drops the old carry.
        const token = p.carryBypass === true ? switchToken : null;
        switchToken = null; bypassCarry = null;
        receive({ kind: "connection", connected: false });
        client.invalidateApprovals("manual_reconnect");
        client.removeAllListeners();
        client.stop();
        client = new CodexClient();
        client.on("event", receive);
        const owner = client;
        client.on("status", (s) => {
          if (!s.connected) initial = null;
          receive(connectionEvent(owner, s));
        });
        initial = null;
        const status = await connect();
        if (owner !== client) throw coreError(owner, "The {core} connection changed. Reconnect to continue.");
        if (token) {
          // The new core's requirements decide (a managed install refuses Bypass); every request still runs validateBypassRequest.
          let bound = null;
          try { bound = bindCarry(token, owner.connection?.approvalConnectionId, await owner.request("configRequirements/read", {}), carryScope(p)); } catch {}
          if (owner !== client) throw coreError(owner, "The {core} connection changed. Reconnect to continue.");
          bypassCarry = bound;
        }
        return { ...status, config, approvalSnapshot: owner.approvalSnapshot(), extensionCores: extensionPacks.descriptors(),
          bypassCarry: carryFor(bypassCarry, owner.connection?.approvalConnectionId, config), connectionNotices };
      }
      // The renderer applied the carry (consume-once): a later reload of the window starts from the saved default.
      case "bypass-carry-clear": {
        bypassCarry = null;
        return true;
      }
      case "interrupt": {
        if (coworkSessions.owns(p.threadId)) {
          if (!config.threadIds.includes(p.threadId) || typeof p.turnId !== 'string') throw new Error('Unknown Cowork task.');
          return coworkSessions.request('turn/interrupt', p);
        }
        const sent = interruptTurn(client, p);
        // Stop closes the session's waiting OpenClaude Desktop tool sheets at once (the core's turn/completed follows): the
        // calls of the turn it stops (a Codex sub-agent's go on, as Codex keeps the sub-agent running).
        if (typeof p?.threadId === "string" && config.threadIds.includes(p.threadId)) agentTools.cancelThread(p.threadId);
        return sent;
      }
      case "steer": {
        if (coworkSessions.owns(p.threadId)) return { ok: false, message: 'Stop the current Cowork task before sending another message.', code: null, data: null };
        return steerTurn(client, p, {
          prepareInput: p.keyword === true && workflowToolService && config.threadIds.includes(p.threadId)
            ? input => workflowToolService.keywordInput(input) : undefined,
          accepted: workflowToolService && config.threadIds.includes(p.threadId)
            ? (id, input) => workflowToolService.userInput(id, input) : undefined,
        });
      }
      case "session-action": {
        if (coworkSessions.owns(p.threadId)) throw new Error('Fork, compact and code review are not available for this Cowork runtime yet.');
        const result = await sessionOperations.run(p);
        // A fork joins the other windows' session lists too.
        if (p.operation === "fork" && result?.thread?.id && config.threadIds.includes(result.thread.id) && result.thread.id !== p.threadId) emitSessionList("added", { ...result.thread, ...(config.threadMetadata[result.thread.id]?.name ? { name: config.threadMetadata[result.thread.id].name } : {}) });
        return result;
      }
      case "btw-session": {
        if (coworkSessions.owns(p.parentId ?? p.sessionId)) return { status: "disabled", reason: "other_surface" };
        if (p.op === "start") return btwSessions.start(p);
        if (p.op === "close") return btwSessions.close(p);
        if (p.op === "plan-stay") return btwSessions.stayPlan(p);
        if (p.op === "detach") return btwSessions.detach(p); // R3-nested NBS-4: 2.42304.0 detachFromParent (/btw tab menu).
        throw new Error("Unknown side session action.");
      }
      case "customize": return customizeOperations.run(p);
      case "codex-features": return codexFeatures.run(p);
      case "local-artifacts": {
        if (p.action === 'read') return artifactIndex.readArtifact(config, p.key, readFile, { force: p.force });
        if (p.action === 'list') {
          const owner = client, snapshot = config;
          if (!artifactIndexed.has(owner)) artifactIndexed.set(owner, new Set());
          if (!artifactRead || artifactRead.owner !== owner) {
            const pending = { owner };
            pending.promise = (async () => { await owner.start(); const result = await artifactIndex.backfillArtifacts(snapshot, (method, params) => coworkSessions.owns(params.threadId) ? coworkSessions.request(method, params) : owner.request(method, params), artifactIndexed.get(owner)); if (snapshot === config) save(); return result; })().finally(() => { if (artifactRead === pending) artifactRead = null; });
            artifactRead = pending;
          }
          return artifactRead.promise;
        }
        if (p.action === 'pin') { const entry = artifactIndex.updateArtifact(config, p); save(); return entry; }
        throw new Error('Unknown artifact operation.');
      }
      case "local-routines": return localRoutines.request(p);
      case "local-projects": {
        const { localProjects } = await import('./local-projects.mjs');
        const result = await localProjects(config, p, { dataDir: app.getPath('userData'), approveFolder: workspaceQueryRoot });
        if (p.action !== 'list') { approvedWorkspaceRoots.add(result.cwd); observedThreadCwds.add(result.cwd); save(); }
        return result;
      }
      case "surface-workspace": {
        const { validSurface } = await import('./surface-policy.mjs');
        if (!validSurface(p.surface) || p.surface === 'code') throw new Error('Choose a valid workspace.');
        const saved = config.surfaceFolders?.[p.surface];
        const dir = typeof saved === 'string' && path.isAbsolute(saved) && fs.existsSync(saved) ? saved : path.join(app.getPath('userData'), 'workspaces', p.surface);
        fs.mkdirSync(dir, { recursive: true });
        observedThreadCwds.add(dir);
        approvedWorkspaceRoots.add(dir);
        return { cwd: dir };
      }
      case "rpc": return requestRpc(p, e.sender);
      case "respond": {
        // A plan card answered 'Accept and bypass permissions': the opt-in and the core's requirements decide,
        // as for any Bypass turn. The owner is captured (and validated) synchronously through the wire write after.
        if (p?.codeDesktop?.afterPlan === "bypass") {
          try {
            await validateBypassRequest({sandbox:"danger-full-access"}, () => config, () => client.request("configRequirements/read", {}));
          } catch (error) {
            return { ok: false, error: { code: "bypass_refused", message: error.message } };
          }
        }
        // A Codex tool suggestion's 'Turn on' (approval-card-model toolSuggestion, enableSuggested): the app (connector)
        // or plugin the request names is turned on first, as the TUI's AppLinkView does (clears apps.<id>.enabled /
        // disabled_reason; plugins.<id> = {enabled: true}), then the suggestion is accepted.
        if (p?.elicitation?.enableSuggested === true) {
          const { enableSuggested, ...elicitation } = p.elicitation;
          void enableSuggested;
          let request;
          try { request = client.getApproval(p.id, p.expected); } catch { return { ok: false, error: { code: "invalid_response", message: "This request is no longer waiting." } }; }
          const meta = request?.params?._meta;
          const toolId = typeof meta?.tool_id === "string" ? meta.tool_id.trim() : "";
          if (request?.method !== "mcpServer/elicitation/request" || meta?.codex_approval_kind !== "tool_suggestion" || meta?.suggest_type !== "enable"
            || !["connector", "plugin"].includes(meta?.tool_type) || !toolId || toolId.length > 256 || /[\u0000-\u001f]/.test(toolId))
            return { ok: false, error: { code: "invalid_response", message: "Invalid response to this request." } };
          const segment = `"${toolId.replace(/[\\"]/g, (ch) => "\\" + ch)}"`;
          try {
            const edits = meta.tool_type === "connector"
              ? [{ keyPath: `apps.${segment}.enabled`, value: null, mergeStrategy: "replace" }, { keyPath: `apps.${segment}.disabled_reason`, value: null, mergeStrategy: "replace" }]
              : [{ keyPath: `plugins.${segment}`, value: { enabled: true }, mergeStrategy: "upsert" }];
            await client.request("config/batchWrite", { edits, reloadUserConfig: true });
          } catch (error) {
            return { ok: false, error: { code: "transport_error", message: `Couldn’t turn it on: ${error?.message || error}` } };
          }
          return respondToApproval(client, { ...p, elicitation });
        }
        // Capture and validate one live owner synchronously through the wire write.
        // R4g-routines RT6: "Allow for this session" on a Code task run's command also keeps the rule on its task.
        return routineApprovals ? routineApprovals.respond(client, p, respondToApproval) : respondToApproval(client, p);
      }
      case "settings": {
        if (p.allowBypassPermissions === true || p.permission === "bypass") {
          // Turning the opt-in on, or remembering Bypass as the mode (preferences.mjs requires the opt-in too):
          // the core's requirements must allow it. Every Bypass turn is still validated on its own.
          await client.start();
          await validateBypassRequest({sandbox:"danger-full-access"}, {allowBypassPermissions:p.allowBypassPermissions ?? config.allowBypassPermissions}, () => client.request("configRequirements/read", {}));
        }
        const previous = config;
        config = {...settingsPatch(config, p, initial?.models || []),...desktopPatch(p)};
        // An explicit model choice is remembered for the running core (never while disconnected).
        if (["model", "effort", "fastMode", "speed"].some((key) => key in p) && initial?.core?.id) {
          const recorded = recordCoreModel(config, initial.core.id);
          if (recorded) config.coreModels = recorded;
        }
        if (config.locale !== previous.locale) { i18n.setLocale(config.locale); process.env.CODE_DESKTOP_LOCALE = i18n.getLocale(); installAppMenu(); }
        if(typeof p.dynamicWorkflows === "boolean")config.dynamicWorkflows=p.dynamicWorkflows;
        // The Workflow tool's presence and description follow Dynamic workflows, the engine choice and the size guideline.
        // Settings › Code › Preview: the running agent servers re-list their tools (notifications/tools/list_changed).
        if (typeof p.agentPreview === "boolean") config.agentPreview = p.agentPreview;
        // R4g-mcp review fix: Settings › agent tools › Visuals (the visualize group, agentToolGroupEnabled; unset reads as on).
        if (typeof p.agentVisualize === "boolean") config.agentVisualize = p.agentVisualize;
        // The Preview pane's "Open links in preview" (src/preview-links-model.mjs), for every window of the profile.
        if (typeof p.previewLinks === "boolean") config.previewLinks = p.previewLinks;
        if (typeof p.previewLinksChooserSeen === "boolean") config.previewLinksChooserSeen = p.previewLinksChooserSeen;
        if (["dynamicWorkflows","workflowEngines","workflowSizeGuideline"].some((key) => key in p) || typeof p.agentPreview === "boolean" || typeof p.agentVisualize === "boolean") {
          agentTools.notifyListChanged();
          // A bridge whose agent keeps the tool list it read when the session opened (ZCode, the ACP agents) reopens
          // its sessions with the new list: an idle one before its next turn, a busy one once its turn ends.
          if (client && coreForEngine(client.serverInfo?.engine).kind === "bridge") void client.request("codeDesktop/appTools/changed", { revision: agentTools.revision }).catch(() => {});
        }
        // Settings › Code › Sandbox network access (permission-policy.mjs turnPermissionParams networkAccess).
        if (typeof p.sandboxNetworkAccess === "boolean") config.sandboxNetworkAccess = p.sandboxNetworkAccess;
        if ("deepseekSessionLog" in p || "deepseekFeedbackSharing" in p) syncPrivacyEnv();
        // First-run setup (src/source-onboarding.jsx) was finished or put off.
        if (typeof p.onboarded === "boolean") config.onboarded = p.onboarded;
        Object.assign(config, toolProfilesPatch(p, previous));
        // shared-2-C6aD8DvJ.js Km {MIN:200, MAX:420} / qm (src/sidebar-width-model.mjs).
        if (typeof p.sidebarWidth === "number" && Number.isFinite(p.sidebarWidth))
          config.sidebarWidth = Math.max(200, Math.min(420, p.sidebarWidth));
        Object.assign(config, sidebarCollapsedPatch(p));
        if (p.sidebarPreferences && typeof p.sidebarPreferences === "object")
          config.sidebarPreferences = p.sidebarPreferences;
        if (p.sessionMetadata && typeof p.sessionMetadata === "object")
          config.sessionMetadata = p.sessionMetadata;
        if (Array.isArray(p.customGroups)) config.customGroups = p.customGroups;
        if (p.rememberedActionCenterCounts && typeof p.rememberedActionCenterCounts === "object") {
          // Placeholder shape for the next launch (official Kk/$i remembered counts, cc43287c9 ez/tz actionCenterPrs).
          // Projects have no local source and stay zero; PRs count the sessions' active pull requests (B08).
          const count = (value) => { const number = Number(value); return Number.isInteger(number) && number >= 0 ? Math.min(number, 999) : 0; };
          config.rememberedActionCenterCounts = { sessions: count(p.rememberedActionCenterCounts.sessions), projects: 0, prs: count(p.rememberedActionCenterCounts.prs) };
        }
        try { save(); } catch (error) { config = previous; throw error; }
        if (config.allowBypassPermissions !== true) switchToken = bypassCarry = null;
        // xh setThemeMode → setThemeMode(e){nativeTheme.themeSource=e}.
        if ("theme" in p) nativeTheme.themeSource = themePreference(config.theme);
        desktopSettings.power();
        menuBar?.update();
        if (typeof p.sidebarCollapsed === "boolean") installAppMenu();
        emitConfig();
        return config;
      }
      case "navigation-state": return setNavigationState(p, windowRegistry.windowForSender(e.sender));
      case "menu-state": return setMenuState(p, windowRegistry.windowForSender(e.sender));
      case "repo-identities": {
        // Fidelity F08 Folder grouping (sidebar-session.js:20892-20903 IJ): cwd -> {isRepo, toplevel, owner,
        // name, parent} for the folders the sidebar shows, resolved read-only and cached per cwd
        // (git-status.cjs repoIdentity). The renderer keys on the cwd until an entry arrives.
        const cwds = Array.isArray(p.cwds) ? [...new Set(p.cwds.filter(cwd => typeof cwd === "string" && path.isAbsolute(cwd)))].slice(0, 200) : [];
        const { repoIdentity } = require("./git-status.cjs");
        // fresh: the renderer saw the folder's repository state change (git init, a remote added): read it again.
        const identities = await Promise.all(cwds.map(cwd => repoIdentity(cwd, { home: os.homedir(), fresh: p.fresh === true })));
        return Object.fromEntries(cwds.map((cwd, index) => [cwd, identities[index]]));
      }
      case "sidebar-state": {
        if (p.operation === "metadata") {
          // A turn that finished in a session some window (or split side) shows is read there. Every window's primary
          // side reports completions for rows it does not show itself, so an automatic unread mark waits a moment for
          // the windows' layout reports (a session a window has just opened) and is dropped while any window shows it.
          // The row menu's Mark as unread is not automatic.
          if (p.automatic === true && p.patch?.unread === true) {
            await new Promise((resolve) => setTimeout(resolve, AUTOMATIC_UNREAD_SETTLE_MS));
            // R4g-btw BT3 (X7-14): a /btw child another window's session tile shows counts too (shared-11 x_ __).
            if (windowRegistry.windowsShowing(p.id, { side: true }).length) return sidebarSnapshot();
          }
          if (![...config.threadIds, ...config.archivedThreadIds].includes(p.id)) throw new Error("Unknown session.");
          const previous = config.sessionMetadata[p.id] || {};
          const patch = {};
          // keepAwake: the row menu's 'Keep computer awake' (only for this session; desktop-settings power()).
          for (const key of ["pinned", "keepAwake"]) if (typeof p.patch?.[key] === "boolean") patch[key] = p.patch[key];
          Object.assign(patch, require('./sidebar-read-state.cjs').sidebarReadStatePatch(p.patch, { automatic: p.automatic === true }));
          if (p.patch?.customGroupId === null || config.customGroups.some(group => group.id === p.patch?.customGroupId)) patch.customGroupId = p.patch.customGroupId;
          if (Array.isArray(p.patch?.additionalFolders)) patch.additionalFolders = [...new Set(p.patch.additionalFolders.filter(dir => typeof dir === "string" && path.isAbsolute(dir) && fs.existsSync(dir)))];
          // The session's own model and effort, picked in it (the Settings / Home model stays the default for new ones).
          for (const [key, max] of [["model", 256], ["effort", 64]]) {
            if (p.patch?.[key] === null) patch[key] = undefined;
            else if (typeof p.patch?.[key] === "string" && p.patch[key] && p.patch[key].length <= max && !/[\u0000-\u001f]/.test(p.patch[key])) patch[key] = p.patch[key];
          }
          config.sessionMetadata[p.id] = Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined));
          if ("keepAwake" in patch) desktopSettings?.power();
          if ("pinned" in patch || "customGroupId" in patch) mirrorSections((owner) => codexSections.placeSession(owner, config, p.id));
        } else if (p.operation === "pinned-order") {
          // Manual Pinned order (official Move up / Move down): only known ids, no duplicates.
          const known = new Set([...config.threadIds, ...config.archivedThreadIds]);
          if (!Array.isArray(p.ids) || p.ids.some(id => typeof id !== "string" || !known.has(id)) || new Set(p.ids).size !== p.ids.length) throw new Error("Invalid pinned order.");
          config.pinnedOrder = [...p.ids];
        } else if (p.operation === "project-order") {
          // Folder/Custom section order (sidebar-groups.js:19700-19728 menu_up / menu_down / reset): project
          // keys (owner/name or a folder path) and "ccg::<group id>" custom keys; [] restores the default.
          if (!Array.isArray(p.ids) || p.ids.length > 1000 || p.ids.some(id => typeof id !== "string" || !id || id.length > 4096) || new Set(p.ids).size !== p.ids.length) throw new Error("Invalid project order.");
          config.projectOrder = [...p.ids];
        // create/rename/delete-group and the section operations (electron/sidebar-sections-store.mjs; Codex mirrors groups only).
        } else if (!sidebarSectionsStore.applySidebarSectionOperation(config, p, { knownSessionIds: () => new Set([...config.threadIds, ...config.archivedThreadIds]),
          mirror: mirrorSections, codexSections, randomUUID: () => require("node:crypto").randomUUID(), getConfig: () => config })) throw new Error("Unsupported sidebar operation.");
        sidebarSectionsStore.syncSidebarSections(config);
        config.sidebarRevision = (config.sidebarRevision || 0) + 1;
        save();
        // Every window's sidebar (and the other split side) follows the change.
        emit({ kind: "sidebar-state", state: sidebarSnapshot() });
        return sidebarSnapshot();
      }
      case "home-shape":
        // Read before Codex connects (official Ti/Kk local store + preferred name):
        // the greeting and the loading placeholder never wait for the catalog.
        return { rememberedActionCenterCounts: config.rememberedActionCenterCounts || { sessions: 0, projects: 0, prs: 0 }, displayName: config.displayName || "" };
      case "stats": {
        // The original stats object (readCodeStats). A failed read without a kept result is
        // an actual failure (official $O: query error without cached data → no card). The
        // last core result paints at once; the fresh fold follows as a 'stats' event.
        // F09 review: only the result of this same core (a CODEX_BINARY Codex never paints a DeepSeek fold).
        const kept = keptCodeStats(config, statsCoreKey(resolveCore()), initial?.core);
        if (!kept) return readCodeStats();
        pushCodeStats();
        return kept;
      }
      // B29 suggested-task backlog (asar LocalSessions getTaskBacklog / dismissTaskBacklogItem / fileBackgroundTasksForLater):
      // Home lists a folder's put-away spawn_task suggestions; a folder that no longer exists lists nothing.
      case "task-backlog-list": {
        if (typeof p.cwd !== "string" || !path.isAbsolute(p.cwd)) return [];
        const limit = Number.isSafeInteger(p.limit) && p.limit > 0 ? Math.min(p.limit, 20) : 20;
        const items = await taskBacklog().list(p.cwd, limit);
        if (!items.length || !fs.existsSync(p.cwd)) return [];
        return items.map(publicBacklogItem);
      }
      case "task-backlog-dismiss": {
        if (typeof p.id !== "string") throw new Error("Unknown task.");
        try { return (await taskBacklog().dismiss(p.id)) !== null; }
        catch (error) { console.warn(`task backlog: ${error?.message ?? error}`); throw new Error("Task backlog unavailable; try again"); }
      }
      case "task-backlog-file": {
        if (typeof p.sessionId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(p.sessionId)) throw new Error("Unknown session.");
        const source = ["dismissed", "evicted", "orphaned"].includes(p.source) ? p.source : null;
        if (!source || !Array.isArray(p.tasks)) throw new Error("Invalid task filing.");
        const sessionCwd = config.threadMetadata?.[p.sessionId]?.cwd;
        // sk: every filing goes to the session's folder (a worktree session's: the repository it came from,
        // sessionMetadata.originCwd), and only a task aimed at that folder (no cwd, or the session's own cwd / origin)
        // is filed; a suggestion for another repository is not put in this one's backlog.
        const originCwd = config.sessionMetadata?.[p.sessionId]?.originCwd || (typeof sessionCwd === "string" && config.worktreeOrigins?.[sessionCwd]) || undefined;
        const folder = originCwd || sessionCwd;
        if (typeof folder !== "string" || !path.isAbsolute(folder)) return 0;
        const own = new Set([sessionCwd, originCwd].filter((dir) => typeof dir === "string" && dir).map((dir) => taskBacklogFolderKey(dir)));
        const filings = p.tasks.slice(0, 20)
          .filter((task) => task?.cwd === undefined || task?.cwd === null || (typeof task.cwd === "string" && own.has(taskBacklogFolderKey(task.cwd))))
          .map((task) => ({
            cwd: folder,
            source, title: typeof task?.title === "string" ? task.title : undefined, tldr: typeof task?.tldr === "string" && task.tldr ? task.tldr : undefined,
            prompt: task?.prompt, suggestedAt: Number.isFinite(task?.suggestedAt) ? task.suggestedAt : Date.now(),
            originSessionId: p.sessionId, originTaskId: task?.taskId,
          }));
        return (await taskBacklog().fileMany(filings)).length;
      }
      // R4f-proposal WI-4 (electron/task-proposals.cjs): the inline proposal card's started-session lineage (spawnedFrom)
      // and its outcomes, kept in config and sent out with the sidebar-state snapshot.
      case "task-proposals": return require("./task-proposals.cjs").run(p, { getConfig: () => config, save, emit, sidebarSnapshot,
        isForeign: (id) => !!coworkSessions?.owns(id) });
      case "session-ack": {
        // Action Center dismiss (official onDismissAwaiting = ack(id, timestamp)
        // + markRead(id)): the row stays hidden until the session's timestamp
        // moves past the acknowledgement, and the session is no longer unread.
        if (![...config.threadIds, ...config.archivedThreadIds].includes(p.id)) throw new Error("Unknown session.");
        if (!Number.isFinite(p.ackedAt) || p.ackedAt < 0) throw new Error("Invalid acknowledgement time.");
        config.sessionMetadata[p.id] = { ...config.sessionMetadata[p.id], ackedAt: Math.floor(p.ackedAt), unread: false };
        config.sidebarRevision = (config.sidebarRevision || 0) + 1;
        save();
        // Every window's sidebar (and the other split side) follows the change.
        emit({ kind: "sidebar-state", state: sidebarSnapshot() });
        return sidebarSnapshot();
      }
      case "workspace-git-status": {
        const cwd = workspaceQueryRoot(p.cwd);
        return workspaceGitStatus(cwd, { preferredBase: sessionBaseBranch(p.sessionId, cwd) });
      }
      case "workspace-git-comparison": {
        const cwd = workspaceQueryRoot(p.cwd);
        return workspaceGitComparison(cwd, { preferredBase: sessionBaseBranch(p.sessionId, cwd) });
      }
      // B08 (cd5a31703 Gde/afe ghLookup): the branch's pull request through the user's GitHub CLI, read-only and
      // cached per checkout+branch (git-pull-request.cjs); {status: found|none|missing|auth|error, pr?}.
      case "workspace-pull-request": {
        const cwd = workspaceQueryRoot(p.cwd);
        return pullRequestLookup().lookup(cwd, typeof p.branch === "string" ? p.branch : null, { fresh: p.fresh === true });
      }
      // Import GitHub issue (ca80fca8d zN, cc43287c9 gH): the draft folder's GitHub issues through the user's gh,
      // read-only (github-issues.cjs): status {available, unavailableReason}, list {issues}, get → the issue or null.
      case "github-issues": {
        const cwd = workspaceQueryRoot(p.cwd);
        if (p.operation === "status") return githubIssues().status(cwd);
        if (p.operation === "list") return githubIssues().list(cwd, typeof p.query === "string" ? p.query : "");
        if (p.operation === "get") return githubIssues().get(cwd, p.number);
        throw new Error("Unknown operation.");
      }
      // F12 diff scope (panes-tile-current.js zm): 'branch' (default, merge-base of the session base), 'uncommitted'
      // or 'commit:<sha>'; `base` is the Changes "Compare against" branch (validated in git-status.cjs).
      case "workspace-git-diff": {
        const cwd = workspaceQueryRoot(p.cwd);
        const scope = p.scope === undefined ? "branch" : p.scope;
        if (typeof scope !== "string" || !/^(branch|uncommitted|commit:[0-9a-fA-F]{7,64})$/.test(scope)) throw new Error("Invalid diff scope.");
        // R4i-files FI2 (diffgit-08-lazy, CxZMGoHL ikt): {includePatches:false, inlinePatchesMaxChangedLines} asks for the
        // inline patch budget (git-status.cjs budgetedDiff), answered with patches_withheld and the files' counts.
        return workspaceGitDiff(cwd, { completeContext: p.completeContext === true, scope,
          base: typeof p.base === "string" ? p.base : undefined, preferredBase: sessionBaseBranch(p.sessionId, cwd),
          ...(p.includePatches === false ? { includePatches: false } : {}),
          ...(typeof p.inlinePatchesMaxChangedLines === "number" ? { inlinePatchesMaxChangedLines: p.inlinePatchesMaxChangedLines } : {}) });
      }
      // R4i-files FI2 (heavyWorkWorker Fy getGitDiffFilePatch): one withheld file's patch in the same working-tree scope;
      // a string ("" when there is none to show) or null.
      case "workspace-git-file-patch": {
        const cwd = workspaceQueryRoot(p.cwd);
        const scope = p.scope === undefined || p.scope === null ? "branch" : p.scope;
        if (scope !== "branch" && scope !== "uncommitted") throw new Error("Invalid diff scope.");
        return workspaceGitFilePatch(cwd, { filePath: p.path, previousPath: typeof p.previousPath === "string" ? p.previousPath : undefined, scope,
          base: typeof p.base === "string" ? p.base : undefined, preferredBase: sessionBaseBranch(p.sessionId, cwd) });
      }
      // B34 (cccc2cf0a Gb getDiffFileImage, heavyWorkWorker j_): one side ('before' | 'after') of a changed image in
      // the same diff scope as workspace-git-diff, as a data URL or null.
      case "workspace-git-image": {
        const cwd = workspaceQueryRoot(p.cwd);
        const scope = p.scope === undefined || p.scope === null ? "branch" : p.scope;
        if (typeof scope !== "string" || !/^(branch|uncommitted|commit:[0-9a-fA-F]{7,64})$/.test(scope)) throw new Error("Invalid diff scope.");
        return workspaceGitImage(cwd, { filePath: p.path, side: p.side, scope,
          base: typeof p.base === "string" ? p.base : undefined, preferredBase: sessionBaseBranch(p.sessionId, cwd) });
      }
      case "workspace-git-commits": {
        const cwd = workspaceQueryRoot(p.cwd);
        return workspaceGitCommits(cwd, { base: typeof p.base === "string" ? p.base : undefined, preferredBase: sessionBaseBranch(p.sessionId, cwd),
          ...(Number.isSafeInteger(p.limit) ? { limit: p.limit } : {}) });
      }
      case "workspace-git-branches": return workspaceGitBranches(workspaceQueryRoot(p.cwd));
      case "workspace-info": {
        const cwd = p.cwd || config.cwd;
        try {
          const [branch, branches, originHead] = await Promise.all([
            run("git", ["-C", cwd, "branch", "--show-current"]),
            run("git", ["-C", cwd, "branch", "--format=%(refname:short)"]),
            // The branch picker pins the repo default first (cc43287c9 :12062-12071); origin/HEAD names it.
            run("git", ["-C", cwd, "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]).catch(() => ({ stdout: "" })),
          ]);
          return {
            isRepo: true,
            branch: branch.stdout.trim(),
            branches: branches.stdout.trim().split("\n").filter(Boolean),
            originHead: originHead.stdout.trim(),
          };
        } catch (error) {
          // B29 rY/nY (pE hostGit): a folder inside a repository (a .git entry up the tree) whose git cannot run reports
          // why, so the composer can say 'Git is required to use a worktree.' instead of hiding the option.
          const unavailable = worktrees.gitUnavailable(error);
          const inRepository = typeof cwd === "string" && (() => { for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
            if (fs.existsSync(path.join(dir, ".git"))) return true;
            if (path.dirname(dir) === dir) return false; } })();
          return { isRepo: false, branch: "", branches: [], ...(unavailable && inRepository ? { gitUnavailable: unavailable.reason, ...(unavailable.message ? { gitError: unavailable.message } : {}) } : {}) };
        }
      }
      // Branch step 2 without a worktree (cc43287c9-BMbiZYzF.js:12084-12095 me, :15860-15912 UR; asar
      // index.chunk-Mak6MV2t.js GitStatusService isWorkingTreeDirty / stashWorkingTree / commitWipForBranchSwitch /
      // discardWorkingTree, index.chunk-l0PS_wmg.js 'switch' at spawn). execFile git only, in a known folder.
      case "branch-switch-check": {
        const cwd = workspaceQueryRoot(p.cwd);
        const [status, branch, numstat] = await Promise.all([
          run("git", ["-C", cwd, "status", "--porcelain", "-z"]),
          run("git", ["-C", cwd, "branch", "--show-current"]),
          run("git", ["-C", cwd, "diff", "HEAD", "--numstat"]).catch(() => ({ stdout: "" })),
        ]);
        const entries = porcelainEntries(status.stdout), files = entries.length;
        let additions = 0, deletions = 0;
        for (const line of numstat.stdout.split("\n")) {
          const [added, deleted] = line.split("\t");
          if (/^\d+$/.test(added)) additions += Number(added);
          if (/^\d+$/.test(deleted)) deletions += Number(deleted);
        }
        // wouldBranchSwitchConflict: `dirty` is set only when the changes block the switch to p.target (unmerged, or
        // a dirty path the target changes); a non-conflicting dirty tree is carried over by 'git switch'.
        const git = (args) => run("git", ["-C", cwd, ...args], { timeout: 30000, maxBuffer: 16 * 1024 * 1024 }).then((result) => result.stdout);
        const dirty = await wouldBranchSwitchConflict(entries, p.target, git);
        return { dirty, branch: branch.stdout.trim(), files, additions, deletions };
      }
      // R4e-envbranch home-15: LocalSessions.isBranchOnOrigin for the start-branch check (cc43287c9 qZ) — the original
      // GitStatusService method over read-only git (r4e-envbranch-origin.cjs); true / false / null.
      case "branch-on-origin":
        return require("./r4e-envbranch-origin.cjs").createHostBranchOnOrigin({ run })(workspaceQueryRoot(p.cwd), p.branch);
      case "branch-switch-resolve": {
        const cwd = workspaceQueryRoot(p.cwd);
        const from = typeof p.currentBranch === "string" ? p.currentBranch : "";
        const output = (error) => `${error?.stdout || ""}\n${error?.stderr || ""}\n${error?.message || ""}`;
        if (p.mode === "stash") {
          // UR passes `epitaxy: pre-switch from ${n}`; stashWorkingTree runs 'stash push -u -m' and treats
          // "No local changes to save" as success.
          try { await run("git", ["-C", cwd, "stash", "push", "-u", "-m", `epitaxy: pre-switch from ${from}`]); }
          catch (error) { if (!/no local changes to save/i.test(output(error))) return { success: false, error: output(error).trim() }; }
        } else if (p.mode === "commit") {
          // commitWipForBranchSwitch → commitAllChanges(cwd, `WIP: epitaxy pre-switch from ${t}`, {skipHooks:true}).
          try { await run("git", ["-C", cwd, "add", "-A"]); }
          catch { return { success: false, error: "Could not stage changes for commit." }; }
          try { await run("git", ["-C", cwd, "commit", "-m", `WIP: epitaxy pre-switch from ${from}`, "--no-verify"]); }
          catch (error) { if (!/nothing (added )?to commit/.test(output(error))) return { success: false, error: output(error).trim() }; }
        } else if (p.mode === "discard") {
          // discardWorkingTree: 'reset --hard', then 'clean -fd -- :/' (a failed clean still counts as success).
          try { await run("git", ["-C", cwd, "reset", "--hard"]); }
          catch (error) { return { success: false, error: output(error).trim() }; }
          await run("git", ["-C", cwd, "clean", "-fd", "--", ":/"]).catch(() => {});
        } else throw new Error("Invalid mode.");
        return { success: true };
      }
      case "branch-checkout": {
        const cwd = workspaceQueryRoot(p.cwd);
        if (typeof p.branch !== "string" || !p.branch || p.branch.startsWith("-")) throw new Error("Invalid branch.");
        await run("git", ["-C", cwd, "switch", p.branch]);
        return { branch: p.branch };
      }
      // R4g-routines RT3: worktree-prepare.mjs (the same steps, messages and config writes as the inline case it replaces).
      case "prepare-worktree": return await prepareWorktreeInMain(p);
      // R4f-rail SR-5: the Session rail's local session record (2.42304.0 shared-8 zh: cwd, originCwd, worktreePath,
      // startedWithWorktree, worktreeRemoved, branch, isArchived, …) from main's own records; null for an unknown session.
      case "session-rail-meta":
        return require("./session-rail-meta.cjs").sessionRailRecord(p, { config, observedCwds: observedThreadCwds, scratchRoot: path.join(app.getPath("userData"), "workspaces"), run });
      // A session's own worktree before it is archived or deleted: its folder and uncommitted changes (the renderer
      // confirms 'Archive/Delete session with uncommitted changes?'), and whether another session still works there.
      // A session the app never recorded has no worktree of the app's (worktree: null), so its delete confirm does not
      // read as a failed check (shared-19 IK shows "Couldn’t check…" only when the check itself fails).
      case "worktree-status": {
        if (typeof p.threadId !== "string" || !p.threadId) throw new Error("Unknown session.");
        if (![...config.threadIds, ...config.archivedThreadIds].includes(p.threadId)) return { worktree: null, changes: 0, shared: false };
        const cwd = config.threadMetadata[p.threadId]?.cwd;
        const dir = typeof cwd === "string" ? (config.worktreeDirectories || []).find((entry) => path.resolve(entry) === path.resolve(cwd)) : null;
        if (!dir) return { worktree: null, changes: 0, shared: false };
        const shared = [...config.threadIds, ...config.archivedThreadIds].some((id) => id !== p.threadId && !(p.leaving || []).includes(id) && path.resolve(config.threadMetadata[id]?.cwd || "") === path.resolve(dir));
        return { worktree: dir, shared, ...(await worktrees.worktreeStatus(run, dir)) };
      }
      // After the session left: its worktree goes (git worktree remove --force; the branch stays), unless another uses it.
      case "worktree-remove": {
        const dir = typeof p.worktree === "string" ? (config.worktreeDirectories || []).find((entry) => path.resolve(entry) === path.resolve(p.worktree)) : null;
        if (!dir) return { removed: false };
        const users = [...config.threadIds, ...config.archivedThreadIds].filter((id) => path.resolve(config.threadMetadata[id]?.cwd || "") === path.resolve(dir) && config.threadIds.includes(id));
        if (users.length) return { removed: false };
        const removed = await worktrees.removeWorktree(run, dir);
        if (removed) { worktrees.forgetWorktree(config, dir); save(); }
        return { removed };
      }
      // Settings › Storage › Remove worktrees: every worktree no session works in and without uncommitted changes.
      case "worktrees-clean": {
        let removed = 0, kept = 0;
        for (const dir of worktrees.unusedWorktrees(config)) {
          const status = await worktrees.worktreeStatus(run, dir);
          if (!status.exists) { worktrees.forgetWorktree(config, dir); continue; }
          if (status.changes > 0 || status.unknown) { kept++; continue; }
          if (await worktrees.removeWorktree(run, dir)) { worktrees.forgetWorktree(config, dir); removed++; } else kept++;
        }
        save();
        return { removed, kept };
      }
      case "code-cleanup-preview": return codeCleanup.preview(p.window);
      case "code-cleanup-run": return codeCleanup.run(typeof p.token === "string" ? p.token : "", { includeUncommitted: p.includeUncommitted === true, deleteSessions: p.deleteSessions === true });
      case "code-cleanup-cancel": codeCleanup.cancel(); return true;
      // App caches and logs › Clear cache and restart… (2.31226.0 Pfa confirm, then Mvi {silent}: the default session's
      // HTTP, code, cache-storage, shader and service-worker caches, host resolver and auth caches; sign-ins stay).
      case "clear-cache-restart": return clearCacheAndRestart(BrowserWindow.fromWebContents(e.sender));
      case "workflow-list": return workflowService.list(p.threadId);
      // Saved workflows of a known folder (~/.claude/workflows and the project's .claude/workflows up to its git root,
      // nearest wins): the '/' menu offers each as /<name> (Claude Code getWorkflowCommands). Only their summary.
      case "saved-workflows": {
        let root;
        try { root = workspaceQueryRoot(p.cwd); } catch { return []; }
        // A core with a saved-workflow library of its own (capabilities.savedWorkflows: ZCode's .zcode/workflows), while
        // its own engine runs this core's workflows: that library, which its engine runs by name (engine 'core').
        if (coreSupports(client?.serverInfo, "savedWorkflows") && currentWorkflowEngine() === "native") {
          const listed = await client.request("codeDesktop/workflows/list", { cwd: root }, 30000);
          knownSavedWorkflowPaths.clear();
          return (Array.isArray(listed?.workflows) ? listed.workflows : []).slice(0, 200).map((entry) => {
            if (typeof entry.path === "string" && path.isAbsolute(entry.path)) knownSavedWorkflowPaths.add(entry.path);
            return { name: entry.name, description: entry.description ?? "", whenToUse: entry.whenToUse ?? "", source: entry.scope === "global" ? "user" : "project",
              scope: entry.scope === "global" ? "global" : "project", path: typeof entry.path === "string" ? entry.path : null, phases: [], engine: "core",
              ...(entry.args && typeof entry.args === "object" ? { args: entry.args } : {}) };
          });
        }
        const { savedWorkflows } = await import(require("node:url").pathToFileURL(path.join(__dirname, "workflow-tool-model.mjs")).href);
        knownSavedWorkflowPaths.clear();
        return savedWorkflows({ cwd: root, home: os.homedir(), folders: coreWorkflowFolders() }).workflows.slice(0, 200).map((entry) => {
          if (typeof entry.path === "string" && path.isAbsolute(entry.path)) knownSavedWorkflowPaths.add(entry.path);
          return {
            name: entry.name, description: entry.description ?? "", whenToUse: entry.whenToUse ?? "", source: entry.source,
            phases: (Array.isArray(entry.phases) ? entry.phases : []).filter((phase) => phase && typeof phase.title === "string").slice(0, 30).map((phase) => phase.title),
            disableModelInvocation: entry.disableModelInvocation === true, ...(typeof entry.path === "string" ? { path: entry.path } : {}),
          };
        });
      }
      // Settings › Dynamic workflows' saved list: a listed workflow's file in Finder; a core library's own workflow deleted,
      // or its run history read (codeDesktop/workflows/delete | runs, by name and scope, in a known folder).
      case "saved-workflow-reveal": {
        if (typeof p.path !== "string" || !knownSavedWorkflowPaths.has(p.path)) throw new Error("Unknown saved workflow.");
        if (!fs.existsSync(p.path)) throw new Error(i18n.t("This saved workflow’s file no longer exists."));
        shell.showItemInFolder(p.path);
        return true;
      }
      case "saved-workflow-delete":
      case "saved-workflow-runs": {
        if (!coreSupports(client?.serverInfo, "savedWorkflows")) throw new Error("Unsupported operation.");
        const root = workspaceQueryRoot(p.cwd);
        if (typeof p.name !== "string" || !p.name || p.name.length > 128) throw new Error("Unknown saved workflow.");
        const scope = p.scope === "global" ? "global" : "project";
        if (action === "saved-workflow-delete") return client.request("codeDesktop/workflows/delete", { cwd: root, name: p.name, scope }, 30000);
        return client.request("codeDesktop/workflows/runs", { cwd: root, name: p.name, scope, limit: 20 }, 30000);
      }
      case "workflow-pick": { const picked=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:i18n.t('Workflow JavaScript'),extensions:['js','mjs','cjs']}]});return picked.canceled?null:picked.filePaths[0]; }
      case "workflow-start": {
        if(!p.plan&&!initial?.models?.some(model=>(model.id===p.model||model.model===p.model)))throw Error(i18n.t('Choose an available model.'));
        if(p.effort&&!initial?.models?.find(model=>(model.id===p.model||model.model===p.model))?.supportedReasoningEfforts?.some(e=>e.reasoningEffort===p.effort))throw Error(i18n.t('Choose an available reasoning effort.'));
        // Agents take the session Mode's access (permission-policy.mjs workflowAccess), derived here, never sent.
        const { workflowAccess, validateBypassRequest } = await import("./permission-policy.mjs");
        const access = workflowAccess({ permission: p.permission, mode: p.mode });
        if (access === "danger-full-access" && !p.plan) {
          const owner = client;
          await validateBypassRequest({ sandbox: "danger-full-access" }, () => config, () => owner.request("configRequirements/read", {}));
          if (owner !== client) throw coreError(owner, "The {core} connection changed. Try again.");
        }
        const { permission, mode, ...options } = p;
        // Settings' Workflow engine and the core's structured output decide how the runner treats this core.
        const structuredMode = runnerStructuredOutput(), structured = structuredMode === undefined ? {} : { structuredOutput: structuredMode };
        return workflowService.start({...options,access,cwd:workspaceQueryRoot(p.cwd),engine:currentWorkflowEngine(),...structured,origin:"user"});
      }
      case "workflow-member": return workflowService.member(p.id,p.memberId,p.action);
      case "workflow-pause": return workflowService.pause(p.id,p.paused===true);
      case "workflow-save": return workflowService.save(p.id,{scope:p.scope==="user"?"user":"project",name:typeof p.name==="string"?p.name.slice(0,200):undefined,overwrite:p.overwrite===true});
      case "workflow-settings": return workflowSettings();
      case "workflow-stop": return workflowService.stop(p.id);
      case "background-read": return backgroundOperations.read(p);
      case "background-terminate": return backgroundOperations.terminate(p);
      case "desktop-settings-read": {
        const owner=client;await owner.start();const connection=owner.connection;
        const requests=[['policy','config/read',{includeLayers:false,cwd:config.cwd}],['requirements','configRequirements/read',{}]];
        const result={desktop:desktopSettings.snapshot(),errors:{}};
        // Codex (native, no permission hints): its permission profiles for Settings › Code (codex-permissions.mjs).
        const codexNative=coreForEngine(owner.serverInfo?.engine).id==='codex'&&owner.serverInfo?.capabilities?.permissionHints!==true;
        if(codexNative)requests.push(['codexProfiles','permissionProfile/list',{cwd:config.cwd||null}]);
        await Promise.all(requests.map(async([key,method,params])=>{try{const value=await owner.request(method,params);if(key==='codexProfiles'){result.codexPermissions={...result.codexPermissions,profiles:customProfiles(value),choice:config.codexPermissionProfile??null};return;}if(key==='policy'){result.mcpDefinitions=mcpDefinitions(value.config);if(codexNative)result.codexPermissions={...result.codexPermissions,configured:typeof value.config?.default_permissions==='string'?value.config.default_permissions:null,writableRoots:Array.isArray(value.config?.sandbox_workspace_write?.writable_roots)?value.config.sandbox_workspace_write.writable_roots:[],networkAccess:value.config?.sandbox_workspace_write?.network_access===true};}result[key]=key==='policy'?{config:{sandbox_mode:value.config?.sandbox_mode,approval_policy:value.config?.approval_policy},origins:Object.fromEntries(Object.entries(value.origins||{}).filter(([name])=>['sandbox_mode','approval_policy'].includes(name)))}:value;}catch(error){recordSettingsFailure(result,key,error);}}));
        // servers:false (the Settings page's first, fast read): skip the MCP status list, which waits for MCP startup.
        if(p.servers!==false)try{let cursor;const servers=[],seen=new Set();do{const page=await owner.request('mcpServerStatus/list',{limit:100,...(config.threadIds.includes(p.threadId)?{threadId:p.threadId}:{}),...(cursor?{cursor}:{})});servers.push(...(page.data||[]).filter(server=>server?.name!==agentTools.SERVER_NAME));cursor=page.nextCursor;if(cursor&&seen.has(cursor))throw Error('MCP pagination did not advance.');if(cursor)seen.add(cursor);}while(cursor&&servers.length<1000&&seen.size<100);result.servers=servers;result.serversTruncated=!!cursor;}catch(error){recordSettingsFailure(result,'servers',error);}
        if(owner!==client||owner.connection!==connection||connection?.closed)throw coreError(owner,'The {core} connection changed. Reconnect to continue.');return result;
      }
      case "instructions": return instructionsService.run(p);
      case "desktop-startup": return desktopSettings.setStartup(p.enabled);
      case "persona": return personaImage.run(p);
      case "desktop-worktree-folder": {
        const result=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory']});if(result.canceled)return null;
        const directory=await fs.promises.realpath(result.filePaths[0]);config={...config,worktreeLocation:'custom',worktreeDirectory:directory};save();return config;
      }
      case "custom-commands": return customCommands.run(p);
      case "desktop-storage": {
        // Fidelity F14: the original's Code sessions and worktrees / Runtime / App caches and logs areas
        // (index.chunk-ChZ67Jhw.js pfi/hfi; logs = app logs + crash dumps).
        const core=resolveCore(),info=client.serverInfo,logs=[];
        for(const name of ['logs','crashDumps'])try{logs.push(app.getPath(name));}catch{}
        const coreName=coreNameOf(info?(info.engine??'codex'):core.kind==='override'?'codex':core.kind);
        // sessionStore: where the running core keeps a session (its descriptor), so its own history is told from the rest.
        const sessionStore=info?coreForEngine(info.engine??'codex').sessionStore??null:null;
        return storageReport({userData:app.getPath('userData'),logs,dshHome:info?.codexHome,coreRoot:storageCoreRoot(core),coreName,
          threadIds:[...config.threadIds,...config.archivedThreadIds],worktreeDirs:config.worktreeDirectories||[],sessionStore,userHome:os.homedir()});
      }
      // R3b-settings cov0-04: the low-disk toast asks on mount and on every window focus (2.42304.0 BOa
      // getFreeDiskSpace: `await FOa() ?? null`, FOa = YAr(app.getPath("userData")): statfs bavail * bsize, walking up to an
      // existing parent; null when nothing can be read).
      case "desktop-free-disk-space": return (await freeDiskSpace(app.getPath("userData"))) ?? null;
      case "theme-file": return themeFiles.run(p);
      case "desktop-edit-config": {
        const error=await shell.openPath(editConfigTarget(client.serverInfo));if(error)throw Error(error);return true;
      }
      case "harness-profile": return harnessProfile.run(p);
      // Import from Claude Code on Codex (codex slash_command.rs Import; tui external_agent_config_migration): detect
      // what can come over (AGENTS.md from CLAUDE.md, config, skills, MCP servers, hooks, commands, sessions…), then
      // import the items the user kept. Only items this window detected are sent back.
      case "codex-import": {
        const owner = client;
        await owner.start();
        if (coreForEngine(owner.serverInfo?.engine).id !== "codex") throw new Error(i18n.t("Importing from Claude Code needs the Codex core."));
        if (p.op === "detect") {
          const cwds = [...new Set([config.cwd, ...(Array.isArray(p.cwds) ? p.cwds : [])].filter((value) => typeof value === "string" && path.isAbsolute(value)))].slice(0, 8);
          const result = await owner.request("externalAgentConfig/detect", { includeHome: true, cwds }, 60000);
          const items = (Array.isArray(result?.items) ? result.items : []).filter((item) => item && typeof item.itemType === "string" && typeof item.description === "string").slice(0, 200);
          owner.connection.claudeImport = items;
          return { items: items.map((item, index) => ({ index, itemType: item.itemType, description: item.description, cwd: typeof item.cwd === "string" && item.cwd ? item.cwd : null })) };
        }
        if (p.op === "import") {
          const detected = owner.connection?.claudeImport;
          if (!Array.isArray(detected)) throw new Error(i18n.t("Detect what to import first."));
          const indices = Array.isArray(p.indices) ? [...new Set(p.indices.filter((index) => Number.isInteger(index) && index >= 0 && index < detected.length))] : [];
          if (!indices.length) throw new Error(i18n.t("Choose at least one item to import."));
          const { importId } = await owner.request("externalAgentConfig/import", { migrationItems: indices.map((index) => detected[index]), source: "code-desktop" }, 60000);
          if (typeof importId !== "string") throw new Error(i18n.t("Codex didn’t start the import."));
          const done = finishedImports.get(importId) ?? await new Promise((resolve) => {
            const timer = setTimeout(() => { pendingImports.delete(importId); resolve(null); }, 300000);
            pendingImports.set(importId, (params) => { clearTimeout(timer); pendingImports.delete(importId); resolve(params); });
          });
          const results = Array.isArray(done?.itemTypeResults) ? done.itemTypeResults : [];
          return { importId, finished: !!done,
            imported: results.reduce((sum, result) => sum + (Array.isArray(result?.successes) ? result.successes.length : 0), 0),
            failures: results.flatMap((result) => (Array.isArray(result?.failures) ? result.failures : []).map((failure) => ({ itemType: failure?.itemType ?? result.itemType, message: typeof failure?.message === "string" ? failure.message : "" }))).slice(0, 50) };
        }
        throw new Error("Unsupported operation.");
      }
      case "cores": {
        if (["select", "uninstall"].includes(p.op)) switchToken = bypassCarry = null;
        const result = await coreManager.run(p);
        // A successful select while Bypass is active mints the token its own reconnect({carryBypass}) consumes.
        if (p.op === "select" && p.carryBypass === true) switchToken = requestCarry(config, carryScope(p));
        // A new choice renames the assistant in the menus now; the renderer reloads for its own copy.
        if (["select", "uninstall"].includes(p.op) && i18n.getAssistantName() !== chosenAssistant()) { i18n.setAssistantName(chosenAssistant()); installAppMenu(); }
        return result;
      }
      case "extensions": {
        if (p.op === "list") return { packs: extensionPacks.list(), bundled: extensionPacks.bundled(), cores: extensionPacks.descriptors() };
        if (p.op === "pick") {
          const chosen = extensionPacks.pickOverride();
          if (chosen) return chosen;
          const result = await dialog.showOpenDialog(win, { title: "Import extension pack", buttonLabel: "Import", properties: ["openFile", "openDirectory"], filters: [{ name: "Extension Pack", extensions: ["zip"] }] });
          return result.canceled ? null : result.filePaths[0] ?? null;
        }
        if (p.op === "inspect") return extensionPacks.inspect(p.path);
        if (p.op === "discard") return extensionPacks.discard(p.token);
        // Installing or removing a pack can change the chosen core's assistant name (a pack core appears, renames,
        // or goes away): the menus follow at once, as after a `cores` select.
        const renamed = (result) => { if (i18n.getAssistantName() !== chosenAssistant()) { i18n.setAssistantName(chosenAssistant()); installAppMenu(); } return result; };
        if (p.op === "install") return renamed({ ...await extensionPacks.install(p.token), cores: extensionPacks.descriptors() });
        if (p.op === "remove") return renamed({ ...extensionPacks.remove(p.id), cores: extensionPacks.descriptors() });
        throw new Error("Unsupported extension pack operation.");
      }
      // Per-session tools (prefs/tool-profiles.mjs): the core's list, and one session's turned-off set, which the
      // core gets with that session's next turn/start or thread/resume.
      case "context-usage": return contextUsageService.read({ threadId: p.threadId, cwd: p.cwd });
      case "tools-list": {
        await client.start();
        if (client.serverInfo?.capabilities?.toolSelection !== true) return { supported: false, tools: [], servers: [] };
        return { supported: true, ...await client.request("codeDesktop/tools/list", {}) };
      }
      case "thread-tools": {
        if (typeof p.threadId !== "string" || ![...config.threadIds, ...config.archivedThreadIds].includes(p.threadId)) throw new Error("Unknown session.");
        const tools = normalizeSelection(p.tools);
        if (tools) config.threadTools[p.threadId] = tools; else delete config.threadTools[p.threadId];
        save();
        return tools;
      }
      case "reveal-settings": {
        const error = await shell.openPath(app.getPath("userData"));
        if (error) throw new Error(error);
        return true;
      }
      case "model-settings": return modelSettings.run(p);
      // Code › Local › "Edit local environment": get / save the variables (applied when the core next starts).
      case "local-environment": return localEnvironment.run(p);
      case "saved-environments": return savedEnvironments.run(p);
      case "reveal-folder":
        await shell.openPath(p.cwd || config.cwd);
        return true;
      case "reveal-tool-file": {
        // c856385e2:1181–1315 Finder action. Resolve symlinks and scope to
        // server-known session cwd; the renderer cannot authorize a root.
        const root = fileSearchRoot(p.sessionId);
        if (typeof p.path !== "string" || !p.path || p.path.includes("\0")) throw new Error("Invalid file path.");
        const target = await scopedPath(root, p.path);
        shell.showItemInFolder(target);
        return true;
      }
      // A deliverable card's Open (source-deliverables.jsx): the file in its default app, scoped like reveal-tool-file.
      // Executables, launchers (.command, .terminal, .webloc…), installers and links to another type are refused, as
      // 2.2553.1's openSessionFileInDefaultApp does (files.cjs openBlockReason); the card's Show in Finder still works.
      case "open-tool-file": {
        const root = fileSearchRoot(p.sessionId);
        if (typeof p.path !== "string" || !p.path || p.path.includes("\0")) throw new Error("Invalid file path.");
        const target = await scopedPath(root, p.path);
        const blocked = await openBlockReason(path.resolve(root, p.path), target);
        if (blocked) throw new Error(i18n ? i18n.t(blocked) : blocked);
        const error = await shell.openPath(target);
        if (error) throw new Error(error);
        return true;
      }
      // The sidebar's 'N sessions could not be loaded' › Remove from sidebar: remembered ids the core can't read any
      // more (deleted or lost outside the app) leave the session list. Each is read once more first: only one the core
      // still can't read is dropped (its files, if they come back, are the core's; nothing is deleted there).
      case "forget-sessions": {
        const ids = Array.isArray(p.threadIds) ? [...new Set(p.threadIds.filter((id) => typeof id === "string" && config.threadIds.includes(id)))].slice(0, 500) : [];
        if (!client?.serverInfo) throw new Error(i18n ? i18n.t("Connect {core} first.", { core: coreNameOf(config.core) }) : "Connect the core first.");
        const owner = client;
        const unreadable = [];
        for (const id of ids) { try { await owner.request("thread/read", { threadId: id, includeTurns: false }); } catch { unreadable.push(id); } }
        if (owner !== client) throw new Error("The core changed. Try again.");
        for (const id of unreadable) {
          config.threadIds = config.threadIds.filter((known) => known !== id);
          delete config.threadMetadata[id];
          delete config.sessionMetadata[id];
          if (config.restoredAt) delete config.restoredAt[id];
          config.pinnedOrder = (config.pinnedOrder || []).filter((known) => known !== id);
        }
        if (unreadable.length) { config.sidebarRevision = (config.sidebarRevision || 0) + 1; save(); for (const id of unreadable) emitSessionList("deleted", id); }
        return { removed: unreadable, kept: ids.filter((id) => !unreadable.includes(id)) };
      }
      case "reveal-config-file": {
        const target = p.path;
        if (typeof target !== "string" || !configWarningPaths.has(target)) throw new Error("Unknown configuration file.");
        if (!fs.existsSync(target)) throw new Error("The file no longer exists.");
        shell.showItemInFolder(target);
        return true;
      }
      // The effort popover's Plan mode row (a core with collaboration modes and no permission hints: Codex): read the
      // Plan effort (configured, else the preset's) and save it as Codex's own plan_mode_reasoning_effort (null clears).
      case "plan-effort": {
        if (client.serverInfo?.capabilities?.permissionHints === true || !coreSupports(client.serverInfo, "collaborationModes")) throw new Error("Unsupported operation.");
        const owner = client;
        await owner.start();
        if (p.op === "write") {
          if (p.value !== null && (typeof p.value !== "string" || !/^[a-z]{1,16}$/.test(p.value))) throw new Error("Unsupported operation.");
          await owner.request("config/value/write", { keyPath: "plan_mode_reasoning_effort", value: p.value, mergeStrategy: "replace" });
        }
        const configured = await owner.request("config/read", { includeLayers: false }, 5000).then((result) => result?.config?.plan_mode_reasoning_effort ?? null, () => null);
        const preset = typeof configured === "string" && configured ? null : (await planModeEffort(owner, null)) ?? null;
        return { configured: typeof configured === "string" && configured ? configured : null, preset };
      }
      // Settings › Models › Responses (Codex): model_reasoning_summary and model_verbosity in Codex's own config, as the
      // CLI keeps them; null clears the key.
      case "codex-model-style": {
        if (client.serverInfo?.capabilities?.permissionHints === true || coreForEngine(client.serverInfo?.engine).id !== "codex") throw new Error("Unsupported operation.");
        const owner = client;
        await owner.start();
        const keys = { summary: ["model_reasoning_summary", ["auto", "concise", "detailed", "none"]], verbosity: ["model_verbosity", ["low", "medium", "high"]] };
        if (p.op === "write") {
          const entry = keys[p.key];
          if (!entry || (p.value !== null && !entry[1].includes(p.value))) throw new Error("Unsupported operation.");
          await owner.request("config/value/write", { keyPath: entry[0], value: p.value, mergeStrategy: "replace" });
        }
        const read = await owner.request("config/read", { includeLayers: false }, 5000).then((result) => result?.config ?? {}, () => ({}));
        return { summary: typeof read.model_reasoning_summary === "string" ? read.model_reasoning_summary : null, verbosity: typeof read.model_verbosity === "string" ? read.model_verbosity : null };
      }
      // Settings › Models › Sub-agents (Codex): its own agents.* settings in config.toml, as the CLI keeps them
      // (config.schema.json AgentsToml): multi-agent tools on or off, the spawned agents' default model and effort, how
      // many run at once per session and how deep they nest. null clears the key (Codex's default).
      case "codex-subagents": {
        if (client.serverInfo?.capabilities?.permissionHints === true || coreForEngine(client.serverInfo?.engine).id !== "codex") throw new Error("Unsupported operation.");
        const owner = client;
        await owner.start();
        const keys = {
          enabled: ["agents.enabled", (value) => typeof value === "boolean"],
          model: ["agents.default_subagent_model", (value) => typeof value === "string" && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value)],
          effort: ["agents.default_subagent_reasoning_effort", (value) => ["minimal", "low", "medium", "high", "xhigh"].includes(value)],
          concurrency: ["agents.max_concurrent_threads_per_session", (value) => Number.isInteger(value) && value >= 1 && value <= 64],
          depth: ["agents.max_depth", (value) => Number.isInteger(value) && value >= 1 && value <= 10],
        };
        if (p.op === "write") {
          const entry = keys[p.key];
          if (!entry || (p.value !== null && !entry[1](p.value))) throw new Error("Unsupported operation.");
          await owner.request("config/value/write", { keyPath: entry[0], value: p.value, mergeStrategy: "replace" });
        }
        const agents = await owner.request("config/read", { includeLayers: false }, 5000).then((result) => result?.config?.agents ?? {}, () => ({}));
        const pick = (key, test) => (test(agents?.[key]) ? agents[key] : null);
        return {
          enabled: pick("enabled", (value) => typeof value === "boolean"),
          model: pick("default_subagent_model", (value) => typeof value === "string" && value.length > 0),
          effort: pick("default_subagent_reasoning_effort", (value) => typeof value === "string" && value.length > 0),
          concurrency: pick("max_concurrent_threads_per_session", Number.isInteger),
          depth: pick("max_depth", Number.isInteger),
        };
      }
      case "codex-trust-project": {
        // Codex disables a project's .codex config, hooks and exec policies until the folder is trusted (configWarning);
        // the TUI's onboarding 'Do you trust the contents of this directory?' writes projects.<root>.trust_level, the Git
        // repository root when the folder is inside one. Only a known workspace folder, only on a core whose own
        // config holds that key (no permission hints: Codex's config/value/write).
        if (client.serverInfo?.capabilities?.permissionHints === true || coreForEngine(client.serverInfo?.engine).id !== "codex") throw new Error("Unsupported operation.");
        const cwd = workspaceQueryRoot(p.cwd);
        if (!path.isAbsolute(cwd)) throw new Error("Unknown workspace directory.");
        let target = fs.realpathSync(cwd);
        try { const top = String((await run("git", ["-C", target, "rev-parse", "--show-toplevel"], { timeout: 5000 })).stdout).trim(); if (top && path.isAbsolute(top)) target = fs.realpathSync(top); } catch {}
        const quoted = `"${target.replace(/[\\"]/g, (ch) => "\\" + ch)}"`;
        const owner = client;
        await owner.start();
        await owner.request("config/value/write", { keyPath: `projects.${quoted}.trust_level`, value: "trusted", mergeStrategy: "replace" });
        return { target };
      }
      case "reveal-item": {
        // Settings › Skills "Show in Finder": reveal a file (SKILL.md) instead of
        // opening it. Only absolute, existing paths reported by skills/list.
        const target = p.path;
        if (typeof target !== "string" || !path.isAbsolute(target) || target.includes("\0") || !(customizeOperations.knownSkillPaths.has(target) || customizeOperations.knownAgentPaths?.has(target))) throw new Error("Unknown skill path.");
        if (!fs.existsSync(target)) throw new Error("The skill file no longer exists.");
        shell.showItemInFolder(target);
        return true;
      }
      case "resume-sessions": {
        // 'Resume a session' (/resume): every session the core keeps (its own CLI's or app's included: thread/list),
        // newest first, sub-agent threads left out; `added` marks the ones already in the sidebar.
        await client.start();
        const params = { limit: 50, sortKey: "updated_at" };
        if (typeof p.cursor === "string" && p.cursor && p.cursor.length <= 256) params.cursor = p.cursor;
        if (typeof p.searchTerm === "string" && p.searchTerm.trim()) params.searchTerm = p.searchTerm.trim().slice(0, 200);
        if (typeof p.cwd === "string" && path.isAbsolute(p.cwd)) params.cwd = p.cwd;
        // Codex with a custom endpoint lists every provider's threads (model-settings decorateThread modelProviders).
        modelSettings.decorateThread("thread/list", params);
        const result = await client.request("thread/list", params);
        const known = new Set([...(config.threadIds || []), ...(config.archivedThreadIds || [])]);
        const text = (value) => (typeof value === "string" ? value : "");
        const row = (thread, snippet = null) => ({ id: thread.id, name: text(thread.name) || null, preview: text(thread.preview).slice(0, 300), cwd: text(thread.cwd), updatedAt: Number(thread.updatedAt) || null,
          createdAt: Number(thread.createdAt) || null, cliVersion: text(thread.cliVersion) || null, importedFrom: text(thread.codeDesktop?.importedFrom) || null, added: known.has(thread.id),
          ...(snippet ? { snippet } : {}) });
        // Workflow agents' threads (the runs' workflowProgress agentId) are the runner's, never the user's sessions.
        const workflowAgents = workflowService?.agentIds?.() ?? new Set();
        const listed = (thread) => thread && typeof thread.id === "string" && !thread.parentThreadId && !thread.source?.subAgent && !workflowAgents.has(thread.id);
        const data = (Array.isArray(result?.data) ? result.data : []).filter(listed).map((thread) => row(thread));
        // A core with full-text search (capabilities.threadSearch: Codex thread/search) adds the sessions whose
        // conversation matches, after the title matches, with the matching snippet (first page only).
        if (params.searchTerm && !params.cursor && coreSupports(client.serverInfo, "threadSearch")) {
          const found = await client.request("thread/search", { searchTerm: params.searchTerm, limit: 50 }, 15000).catch(() => null);
          const seen = new Set(data.map((entry) => entry.id));
          for (const match of Array.isArray(found?.data) ? found.data : []) {
            if (!listed(match?.thread) || seen.has(match.thread.id)) continue;
            if (params.cwd && match.thread.cwd !== params.cwd) continue;
            seen.add(match.thread.id);
            data.push(row(match.thread, text(match.snippet).slice(0, 300) || null));
          }
        }
        return { data, nextCursor: typeof result?.nextCursor === "string" ? result.nextCursor : null };
      }
      case "thread-search": {
        // Sidebar search on a core with full-text search (capabilities.threadSearch: Codex thread/search): the sessions
        // whose conversation matches, by id, with their snippet. A short or empty term searches nothing.
        const term = typeof p.searchTerm === "string" ? p.searchTerm.trim().slice(0, 200) : "";
        if (term.length < 2) return { data: [] };
        await client.start();
        if (!coreSupports(client.serverInfo, "threadSearch")) return { data: [] };
        const found = await client.request("thread/search", { searchTerm: term, limit: 100, ...(typeof p.archived === "boolean" ? { archived: p.archived } : {}) }, 15000);
        return { data: (Array.isArray(found?.data) ? found.data : []).filter((match) => typeof match?.thread?.id === "string")
          .map((match) => ({ id: match.thread.id, snippet: typeof match.snippet === "string" ? match.snippet.slice(0, 300) : "" })) };
      }
      case "resume-add": {
        // A session picked in 'Resume a session': confirmed by the core (thread/read) and added to the sidebar.
        if (typeof p.threadId !== "string" || !p.threadId || p.threadId.length > 200) throw new Error("Unknown session.");
        await client.start();
        const read = await client.request("thread/read", { threadId: p.threadId, includeTurns: false });
        const thread = read?.thread;
        if (!thread || thread.id !== p.threadId) throw new Error("That session can’t be opened.");
        config.threadIds = [...new Set([thread.id, ...config.threadIds])];
        config.archivedThreadIds = config.archivedThreadIds.filter((id) => id !== thread.id);
        const { turns, ...metadata } = thread;
        void turns;
        config.threadMetadata[thread.id] = metadata;
        config.stats[thread.id] ??= { messages: 0, tokens: 0, observedTokens: 0, observedUsage: { input: 0, output: 0, cached: 0, cacheWrite: 0 }, ids: [] };
        if (typeof metadata.cwd === "string") observedThreadCwds.add(metadata.cwd);
        save();
        emitSessionList("added", metadata);
        return { threadId: thread.id };
      }
      // Official getInstalledEditors / openInEditor (editors.cjs): the code editors on this Mac, and one opening a file
      // or folder. The path must be absolute and exist; the editor must be one of the known, installed ones.
      case "installed-editors": return require("./editors.cjs").installedEditors();
      case "open-in-editor": return require("./editors.cjs").openInEditor(p.path, p.type, {line:p.line});
      case "open-terminal": {
        // Official "Open in → Terminal" (c80a67939 Open in submenu). The folder
        // must be an absolute existing directory; nothing else is passed to open.
        const cwd = typeof p.cwd === "string" && p.cwd ? p.cwd : config.cwd;
        if (!path.isAbsolute(cwd) || cwd.includes("\0")) throw new Error("Unknown workspace directory.");
        let stat;
        try { stat = await fs.promises.stat(cwd); } catch { throw new Error("The session folder no longer exists."); }
        if (!stat.isDirectory()) throw new Error("The session folder no longer exists.");
        await externalOpeners.terminal(cwd);
        return true;
      }
      case "slash-export": {
        if (!config.threadIds.includes(p.threadId) || typeof p.markdown !== "string") throw new Error("Unknown session export.");
        // A core that exports its whole session log (capabilities.sessionLogExport: DeepSeek's dsh-session-log-export ZIP with
        // sub-agent sessions and attachments) is offered as a second format; the file type chosen decides.
        const zip = coreSupports(client.serverInfo, "sessionLogExport");
        // The session's title and today's date in Downloads ("Build script question 2026-10-09.md"), so one export never
        // offers to replace another.
        const chosen = await dialog.showSaveDialog(win, { title: i18n.t("Export conversation"), defaultPath: path.join(app.getPath("downloads"), exportFileName(config.threadMetadata?.[p.threadId], i18n.t("Conversation"))),
          filters: [{name:i18n.t("Markdown transcript"),extensions:["md"]}, ...(zip ? [{name:i18n.t("Session log with sub-agents and attachments (ZIP)"),extensions:["zip"]}] : [])] });
        if (chosen.canceled || !chosen.filePath) return null;
        if (zip && /\.zip$/i.test(chosen.filePath)) {
          await client.request("codeDesktop/sessionLog/export", { threadId: p.threadId, path: chosen.filePath }, 10 * 60 * 1000);
          return chosen.filePath;
        }
        await fs.promises.writeFile(chosen.filePath, p.markdown, "utf8");
        return chosen.filePath;
      }
      case "cowork-rewind": {
        // R4i-cowork CW2/CW3 (X2 CW-3): the host LocalAgentModeSessions.rewindV2 (2.42304.0 mainView.js
        // "LocalAgentModeSessions_$_rewindV2", muI2IV6k ["rewindV2",[["sessionId",F],["targetMessageUuid",F]],Kxt]):
        // {prefill?, refusal?} from the Cowork runtime's rewindSessionV2 port; serialized with sends like slash-rewind.
        if (!COWORK_ENABLED) throw new Error(i18n.t('Cowork is still in development.'));
        if (!coworkSessions?.owns(p?.threadId) || !config.threadIds.includes(p.threadId)) throw new Error('Unknown Cowork session.');
        if (typeof p.targetMessageUuid !== 'string' || !p.targetMessageUuid) throw new Error('Unknown Cowork message.');
        const release=sessionOperations.reserveMessage(p.threadId);
        try {
          const result=await coworkSessions.request('cowork/rewind',{threadId:p.threadId,targetMessageUuid:p.targetMessageUuid});
          return { ...(result.prefill !== undefined ? { prefill: result.prefill } : {}), ...(result.refusal !== undefined ? { refusal: result.refusal } : {}) };
        } finally { release(); }
      }
      case "slash-rewind": {
        // R4g-small SM3 (X2 CW-0): a Cowork session never reaches the core's thread/revert; c21f11e6d lO
        // (ke.Unsupported, id "SC1NI+O8Y4") until the Cowork runtime can rewind (CW-2).
        if (coworkSessions.owns(p.threadId)) throw new Error(i18n.t("Messages in this task can’t be edited or restarted from. Send what you need as a new message instead."));
        const owner=client, connection=owner?.connection;
        const matches=()=>owner===client && connection && !connection.closed && connection.approvalConnectionId===p.expected?.connectionId && connection.approvalConnectionEpoch===p.expected?.connectionEpoch;
        if(!matches() || !config.threadIds.includes(p.threadId) || typeof p.beforeTurnId!=="string" || !p.beforeTurnId) throw new Error("This session changed. Reopen it before rewinding.");
        const release=sessionOperations.reserveMessage(p.threadId);
        try {
          const response=await owner.request("thread/read",{threadId:p.threadId,includeTurns:false});
          if(response.thread?.historyMode!=="paginated") throw new Error("Rewind is not available for legacy sessions.");
          if(!matches())throw new Error("Connection changed before rewind.");
          // Rewind conversation and code: only where the core reports capabilities.rewindFiles (Gemini's file restore).
          const restoreFiles=p.restoreFiles===true&&owner.serverInfo?.capabilities?.rewindFiles===true;
          return await owner.request("thread/revert",{threadId:p.threadId,beforeTurnId:p.beforeTurnId,...(restoreFiles?{codeDesktop:{restoreFiles:true}}:{})});
        } finally {release();}
      }
      // c749529a1 getAll's Recent fields (originCwd, folderExists, isScratchWorkspace) for the renderer's sessions.
      case "recent-folder-sessions": {
        const { sessionFolders } = require("./recent-folders.cjs");
        const known = new Set([...config.threadIds, ...config.archivedThreadIds]);
        // B03 review: the folder is main's own record of the session (its threadMetadata cwd, or a cwd thread/list
        // reported), never a renderer-supplied path: these origins become folders 'folder' accepts as a Recent pick.
        const sessions = (Array.isArray(p.sessions) ? p.sessions : []).filter((session) => known.has(session?.id)).slice(0, 2000).flatMap((session) => {
          const recorded = config.threadMetadata?.[session.id]?.cwd;
          const cwd = typeof session.cwd === "string" && (session.cwd === recorded || observedThreadCwds.has(session.cwd)) ? session.cwd : recorded;
          return typeof cwd === "string" && cwd ? [{ id: session.id, cwd }] : [];
        });
        const result = await sessionFolders(sessions, { config, scratchRoot: path.join(app.getPath("userData"), "workspaces"), run });
        if (result.changed) save();
        for (const entry of Object.values(result.sessions)) recentFolderPaths.add(entry.originCwd);
        return result.sessions;
      }
      // c749529a1 P → LocalSessions.getDetectedProjects (index.chunk-BMnTSdxh.js): editor recents and scanned projects.
      case "detected-projects": {
        // An isolated profile (CODE_DESKTOP_DATA: the UI suites) never reads this Mac's editors and code folders
        // unless it names a home to scan (CODE_DESKTOP_DETECTED_PROJECTS_HOME).
        if (!detectedProjects) {
          const { createDetectedProjects, detectProjects } = require("./recent-folders.cjs");
          const home = process.env.CODE_DESKTOP_DETECTED_PROJECTS_HOME || (process.env.CODE_DESKTOP_DATA ? null : os.homedir());
          detectedProjects = createDetectedProjects({ detect: () => home ? detectProjects(home) : Promise.resolve([]) });
        }
        const list = await detectedProjects.get();
        for (const entry of list) recentFolderPaths.add(entry.path);
        return list.map(({ path: dir, name, source, lastActivity }) => ({ path: dir, name, source, lastActivity }));
      }
      case "folder": {
        // A Recent folder pick (cc43287c9 FZ P → onSelectFolder, the same path as a browsed folder; shared-75
        // ccd-session-store persists selectedFolder): one of the listed folders becomes the remembered session folder.
        if(!p.additional && typeof p.path === "string") {
          const known = recentFolderPaths.has(p.path) || [config.cwd, ...approvedWorkspaceRoots, ...observedThreadCwds, ...Object.values(config.threadMetadata || {}).map(meta => meta?.cwd)].includes(p.path);
          if(!known || !path.isAbsolute(p.path)) throw new Error("Unknown workspace directory.");
          const stat = await fs.promises.stat(p.path).catch(() => null);
          if(!stat?.isDirectory()) throw new Error(i18n.t("That folder no longer exists."));
          await fileSearch.cancelAll();
          if (p.surface === 'cowork' || p.surface === 'chat') config.surfaceFolders = { ...config.surfaceFolders, [p.surface]: p.path };
          else config.cwd = p.path;
          approvedWorkspaceRoots.add(p.path);
          save();
          return p.path;
        }
        if(p.additional && typeof p.path === "string") {
          const expanded=p.path.startsWith("~/")?path.join(os.homedir(),p.path.slice(2)):p.path;
          const absolute=path.resolve(workspaceQueryRoot(p.cwd),expanded);
          const real=await fs.promises.realpath(absolute);
          if(!(await fs.promises.stat(real)).isDirectory())throw new Error("Choose a directory.");
          approvedWorkspaceRoots.add(real);
          return real;
        }
        // cc43287c9-BMbiZYzF.js:21955-21962 / :21983-21990 (ta(title)): 'Select folder for local session' for
        // the session folder, 'Add folder to session' for an additional one; macOS shows the message line.
        const title = p.additional ? i18n.t("Add folder to session") : i18n.t("Select folder for local session");
        const r = await dialog.showOpenDialog(win, {
          title,
          message: title,
          properties: ["openDirectory"],
          defaultPath: config.cwd,
        });
        if (r.canceled) return null;
        if (p.additional) { approvedWorkspaceRoots.add(r.filePaths[0]); return r.filePaths[0]; }
        await fileSearch.cancelAll();
        const dir = r.filePaths[0];
        if (p.surface === 'cowork' || p.surface === 'chat') config.surfaceFolders = { ...config.surfaceFolders, [p.surface]: dir };
        else config.cwd = dir;
        approvedWorkspaceRoots.add(dir);
        save();
        return dir;
      }
      // File › Open File… (ZCr): a file chosen in the dialog. One inside the open session's folder (p.inside) opens there;
      // another makes its folder the new session's folder, as Open Folder… does.
      case "open-file-dialog": {
        const r = await dialog.showOpenDialog(win, { title: i18n.t("Open File"), properties: ["openFile"], defaultPath: typeof p.inside === "string" && path.isAbsolute(p.inside) ? p.inside : config.cwd });
        if (r.canceled || !r.filePaths?.[0]) return null;
        const file = await fs.promises.realpath(r.filePaths[0]);
        const inside = typeof p.inside === "string" && path.isAbsolute(p.inside) ? await fs.promises.realpath(p.inside).catch(() => p.inside) : null;
        if (inside && file.startsWith(inside.endsWith(path.sep) ? inside : inside + path.sep)) return { path: file, folder: inside, inside: true };
        const folder = path.dirname(file);
        await fileSearch.cancelAll();
        config.cwd = folder;
        approvedWorkspaceRoots.add(folder);
        save();
        return { path: file, folder, inside: false };
      }
      case "dismiss-recent-folder": {
        // lH 'Remove from recent' (cc43287c9 :21652, :21921-21928 → c749529a1 dismiss): one dismissedAt (ms) per
        // path; the Recent list hides the folder until a session is created there afterwards.
        if (typeof p.path !== "string" || !p.path) throw new Error("Invalid folder.");
        const previous = config.dismissedRecentFolders;
        config.dismissedRecentFolders = { ...(previous && typeof previous === "object" ? previous : {}), [p.path]: Date.now() };
        try { save(); } catch (error) { config.dismissedRecentFolders = previous; throw error; }
        return config.dismissedRecentFolders;
      }
      case "attachments": {
        const r = await dialog.showOpenDialog(win, {
          properties: ["openFile", "multiSelections"],
        });
        return r.canceled ? [] : inspectAttachments(r.filePaths);
      }
      case "attachments:inspect": return inspectAttachments(p.paths);
      case "attachments:stage": return stageAttachment(p);
      case "files":
        return listFiles(p.cwd || config.cwd, p.relative || "", {
          includeChild: p.includeChild,
        });
      case "files:content-search":
      case "files:search":
        return fileSearch.search({
          scope: fileSearchScope(e.sender, p.pane),
          requestId: p.requestId,
          root: fileSearchRoot(p.sessionId, p.homeWorkspace),
          query: p.query,
          browse: p.browse === true,
          // B33: the Files pane filter asks for folder rows when its query ends in '/' (cccc2cf0a Fv).
          folders: action === "files:search" && p.folders === true,
          ...(action === "files:content-search" ? {mode:"content",options:p.options} : {}),
        });
      case "files:watch":
        return filesWatch.set(e.sender, { watchId: p.watchId, cwd: p.cwd || config.cwd, dirs: p.dirs });
      case "files:search:cancel": {
        if (typeof p.requestId !== "string" || !p.requestId || p.requestId.length > 128)
          throw new Error("Invalid search request identifier.");
        return fileSearch.cancel(fileSearchScope(e.sender, p.pane), p.requestId);
      }
      case "file:edit-read":
        return readEditableFile(p.cwd || config.cwd, p.relative);
      case "file:save":
        return writeEditedFile(p.cwd || config.cwd, p.relative, p.text, p.expectedHash);
      case "file:document-bytes":
      case "file": {
        // Files pane viewer: classified results (files.cjs); force re-reads a binary file as text.
        const root = p.cwd || config.cwd;
        const readOptions = { force: p.force === true, documentBytes: action === 'file:document-bytes' };
        const result = await readFile(root, p.relative, readOptions);
        // B32: a file outside the working folder but inside one of the session's added folders (the outside-root
        // card's Add folder, /add-dir) reads from that folder, as the original reads every session folder.
        const added = typeof p.sessionId === "string" ? config.sessionMetadata?.[p.sessionId]?.additionalFolders : null;
        const absolute = result?.unavailable === "outside_root" && Array.isArray(added) ? sessionFileAccess.requestedAbsolute(root, p.relative) : null;
        // Added folders are stored as real paths (main 'folder'), so a path through a link such as /tmp → /private/tmp
        // is matched by its real path too.
        const hit = absolute ? sessionFileAccess.sessionFolderFor(absolute, added)
          ?? sessionFileAccess.sessionFolderFor(await fs.promises.realpath(absolute).catch(() => ""), added) : null;
        if (!hit) return result;
        const inner = await readFile(hit.folder, hit.relative, readOptions);
        return { ...inner, path: p.relative, ...(inner.unavailable === "missing" ? { creatable: false } : {}) };
      }
      // B32 (cd2efac6e Gl → showSessionFileInFolder): Show in Finder for a session file, also one outside the
      // working folder; false (not an error) when there is no regular file to show.
      // R3-files FT-05 (files-11): LocalSessions isSessionPathGone for the Files tree / search result menus (2.42304.0
      // c856385e2 V asks it before a menu opens): true only for a path inside the session's folders that no longer exists
      // (files.cjs). An unknown session is not gone, as the original's judge answers null without session paths.
      case "file:gone": {
        if (typeof p.sessionId !== "string") return false;
        let root;
        try { root = fileSearchRoot(p.sessionId); } catch { return false; }
        const added = config.sessionMetadata?.[p.sessionId]?.additionalFolders;
        return sessionPathGone({ sessionId: p.sessionId, root, sessionFolders: Array.isArray(added) ? added : [], filePath: p.path });
      }
      case "file:reveal-session": {
        const root = typeof p.cwd === "string" && path.isAbsolute(p.cwd) ? p.cwd : fileSearchRoot(p.sessionId);
        return sessionFileAccess.revealSessionFile({ root, filePath: p.path, showItemInFolder: (target) => shell.showItemInFolder(target) });
      }
      // B32 (cd2efac6e tp → suggestFolderForSessionFile): the folder the outside-root card offers to add, or null.
      case "file:folder-offer": {
        const root = typeof p.cwd === "string" && path.isAbsolute(p.cwd) ? p.cwd : fileSearchRoot(p.sessionId);
        const added = typeof p.sessionId === "string" ? config.sessionMetadata?.[p.sessionId]?.additionalFolders : null;
        const folder = await sessionFileAccess.suggestFolderForFile({ root, sessionFolders: Array.isArray(added) ? added : [], filePath: p.path });
        // home: the card shows the folder with it as "~" (fe(tp, homePath)).
        return folder ? { folder, home: os.homedir() } : null;
      }
      // B13: the HTML preview frame of the text the viewer shows (file-preview-frame.cjs), and its release.
      case "file:preview-frame":
        return filePreviewFrames.register({ root: p.cwd || config.cwd, relative: p.relative, text: p.text });
      case "file:preview-frame-release":
        return filePreviewFrames.release(p.url);
      case 'image:read': return imageOperations.read(p);
      case 'image:copy': return imageOperations.copy(p);
      case 'image:save': return imageOperations.save(p);
      case "external": {
        const url = new URL(p.url);
        // mailto:/tel: as the composer's link bubble opens them (ca80fca8d KM zM /^(https?|mailto|tel):/i).
        if (!["https:", "http:", "mailto:", "tel:"].includes(url.protocol))
          throw new Error("Unsupported URL.");
        await shell.openExternal(url.href);
        return true;
      }
      case "login": return accountOperations.start(p.type || 'chatgpt', { apiKey: p.apiKey, codeDesktop: p.codeDesktop });
      case "account-auth": return accountOperations.run(p);
      default:
        throw new Error("Unknown operation.");
    }
  });
  installAppMenu();
  desktopReady = true;
  const [firstWindow, ...otherWindows] = windowRegistry.mainWindows();
  for (const window of otherWindows) loadMainWindow(window).catch(() => {});
  await loadMainWindow(firstWindow);
  // The window focused at the last quit comes back in front.
  const lastFocusedWindow = windowRegistry.byKey(restoredWindows.focused);
  if (otherWindows.length && lastFocusedWindow && lastFocusedWindow.isVisible()) lastFocusedWindow.focus();
  menuBar = createMenuBar({Tray,Menu,nativeImage,app,iconPath:path.join(__dirname,"assets/TrayIconTemplate.png"),menuModel:await import("./tray-menu.mjs"),
    getWindow:()=>win,getEnabled:()=>config.menuBarEnabled!==false,getAccount:()=>accountOperations.accountSnapshot(),getClient:()=>client});
  menuBar.update();
  void restorePopouts().catch((error) => console.warn("Pane windows:", error?.message ?? error));
});
// index.chunk-ChZ67Jhw.js installQuitSessionGuard: a quit while a session has a running turn, workflow or background
// commands first asks (Quit anyway / Wait for DeepSeek / Cancel). Automated launches (Playwright's remote debugging
// port, the offscreen verification adapter) quit without asking, like the original's skip predicate.
const quitGuard = createQuitGuard({
  app, dialog, getWindow: () => win,
  t: (source, values) => i18n ? i18n.t(source, values) : String(source).replace(/\{(\w+)\}/g, (match, key) => values?.[key] ?? match),
  countNow: () => liveWork.sessions().size,
  terminalsNow: () => terminalService.runningCommands().length,
  mayFindMore: () => Boolean(client?.connection && liveWork.touchedSessions().length),
  count: async () => {
    const sessions = liveWork.sessions();
    for (const id of await backgroundSessions({ client, ids: liveWork.touchedSessions().filter((id) => !sessions.has(id)) })) sessions.add(id);
    return sessions.size;
  },
  onChange: (listener) => liveWork.onChange(listener),
  skip: () => app.commandLine.hasSwitch("remote-debugging-port") || Boolean(process.env.CODE_DESKTOP_OFFSCREEN_LAUNCH),
  onError: (error) => console.warn("Quit guard:", error),
});
// quitting is set once shutdown starts (onStart), so the deferred quit's window close is let through; a quit the guard
// holds (or the user cancels) leaves the window's close-hides behavior alone.
installShutdownHandler(app, {
  guard: (event) => {
    if (fileAutosaveQuitGate.handle(event)) return true;
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !confirmFileEdits(window)) { event.preventDefault(); return true; }
    }
    return quitGuard.handle(event);
  },
  onStart: () => { quitting = true; try { savePopoutsForRelaunch(); } catch (error) { console.warn("Pane windows:", error?.message ?? error); } },
  stop: async () => {
    customCommands.dispose();
    const terminalsStopped = terminalService.dispose();
    desktopSettings?.dispose();
    menuBar?.dispose();
    // Dev servers get TERM, a moment to exit, then KILL for what is left of their process group (preview-service.cjs).
    const previewsStopped = Promise.resolve(previewService?.dispose()).catch(() => {});
    monitorService.dispose();
    scheduleService.dispose();
    localRoutines?.dispose();
    await pauseActiveGoals().catch(() => {});
    await Promise.all([stopAllCodexClients(), coworkSessions?.stop(), fileSearch.dispose(), workflowService?.dispose()]);
    agentTools.stop();
    await Promise.all([terminalsStopped, previewsStopped]);
  },
});
// index.chunk-ChZ67Jhw.js: window-all-closed does nothing (the app keeps
// running; the main window only hides), and "activate" (a Dock click) restores
// a minimized main window when nothing is visible, shows a hidden one, or
// recreates it when it no longer exists.
app.on("window-all-closed", () => {});
app.on("activate", (_event, hasVisibleWindows) => {
  if (quitting || !desktopReady) return;
  const exists = liveContents(win);
  const action = activateAction({ exists, minimized: exists && win.isMinimized(), visible: exists && win.isVisible(), hasVisibleWindows });
  if (action === "create") openMainWindow().catch(() => {});
  else if (action === "restore") win.restore();
  else if (action === "show") win.show();
});
