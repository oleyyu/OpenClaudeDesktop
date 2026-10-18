// The Preview pane's browser and dev servers, per session (main process).
//
// Each session owns a tab group, with one WebContentsView per live tab (PreviewContext: a WebContentsView, never
// a <webview>) in the "persist:preview" partition: no Node, context isolation, sandbox, no dialogs, every
// permission denied (clipboard writes on localhost aside), downloads through the system Save dialog of the window
// showing the page (refused for a page nobody sees), http(s) pages anywhere and file://
// only inside the session's folder. The renderer pane that shows the session reports its viewport rectangle
// (preview-attach) and the view is laid over it in that pane's window.
//
// Who shows the page follows 2.2553.1 (index.chunk showPreview/hidePreview, claimantId = the pane slot's useId):
// the page has one host at a time. The pane showing it holds it; another pane of the same session (split view, a
// second window) asking to show it is refused — no notice, it paints the empty viewport and asks again 50/250/1000 ms
// later and on its next layout change — and its hide is ignored. A holder that hides the page (pane closed or not
// visible, session switched, an overlay covering it, window gone) lets go, and the next pane that shows it takes it.
// A page nobody shows moves to a hidden parking window and keeps running, so the agent's tools keep working; after
// five minutes unseen (2.2553.1 "Reaped hidden preview view", 3e5 ms) a localhost or file page is closed — its dev
// server keeps running — and comes back at the same address when a pane shows it or the agent uses it again.
//
// Overlays: a WebContentsView is drawn above the window's DOM, so a menu or dialog over the pane would be hidden
// behind the page. The pane detects that (preview-occlude): the view is captured, hidden, and the capture stands in
// until the overlay leaves.
//
// Dev servers come from the session folder's .claude/launch.json (preview-launch.mjs) and are shared by every
// session of that folder: spawned in the folder with the app's environment (login-shell PATH, no app secrets) plus
// PORT, logs kept, ready once the port answers (and, as 2.42304.0 checks, answers from the server's own processes),
// stopped as a process group. A busy port moves to the next free one unless "autoPort": false or the start script pins
// it (the original port policy, r3b-preview-host.mjs). Closing a pane or a window never stops
// them; Stop (the pane's menu, preview_stop) or quitting the app does. Such a command runs outside the core's sandbox,
// so the agent (preview_start) starts one only after the user approved that exact configuration in this session; the
// user's own Start in the pane never asks.
//
// Outside sites: the agent asks once per site and session before it opens or uses one, a declined site stays
// declined, and while the agent drives the page the page's own navigations and popups to an unapproved outside site
// are held and asked about the same way (holdOutside), so a link, redirect or script can't take it there unasked.
//
// CDP (webContents.debugger) gives the console and network logs, device emulation for the viewport presets and
// the color scheme, screenshots, and native input. A page in the parking window gets no native input, so clicks
// and keys there are DOM events in an isolated world (preview-page-scripts.cjs).
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn, execFile } = require("node:child_process");
const { previewTabKeyCommand } = require("./preview-tab-shortcuts.mjs");
const { closedTabsPerSession, closedTabSessions, beginSyntheticInput, endSyntheticInput } = require("./generated/preview-tab-shortcuts.mjs");
const scripts = require("./preview-page-scripts.cjs");
const { PREVIEW_STORAGE_MODES, previewStorageMode, previewStoragePartition, previewStorageRebindTabs } = require("./preview-storage.mjs");
const launch = require("./preview-launch.mjs");
const { previewAddressTarget } = require("./preview-address.mjs");
const { previewLinkOrigin, externalOnlyLink } = require("./generated/preview-link-origin.mjs");
const { createPreviewElementInspector } = require("./generated/preview-element-inspector.mjs");
const { createPreviewSelection } = require("./preview-selection.mjs");
const allowedOrigins = require("./preview-allowed-origins.mjs");
// R3b-preview (preview-01/03/12/14): the 2.42304.0 port policy, identity check and preview user agent, and their host side.
const previewHost = require("./r3b-preview-host.mjs");
// R4e-preview (preview-15): the 2.42304.0 check that a point from the agent's screenshot still fits the page (C4i);
// R4f-preview-coords (F2): the point in the screenshot's pixels, checked against its frame and mapped (S4i, b4i).
const { createPreviewCoordinateGuard, imageSize } = require("./r4e-preview-coordinates.mjs");

// Cookies and local storage of previewed pages (2.2553.1 legacy preview "Keep cookies"): by default an in-memory session
// for this app run (EPHEMERAL_PARTITION); with Servers & settings › Keep cookies, the on-disk one, kept across restarts.
// Either is shared by every session's preview.
const PARTITION = "persist:preview";
const EPHEMERAL_PARTITION = "code-desktop-preview";
const CONSOLE_LIMIT = 500;
const NETWORK_LIMIT = 300;
const LOG_LIMIT = 1000;
const READY_TIMEOUT_MS = 180000;
const EARLY_EXIT_MS = 3000;
const PRESETS = Object.freeze({ mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 } });
const COLOR_SCHEMES = new Set(["system", "light", "dark"]);
const PLACEHOLDER = { dark: "#131312", light: "#f5f5f5" };
// 2.2553.1 q_r: a hidden page is reaped after five minutes unseen.
const REAP_HIDDEN_MS = 300000;
// What the agent's console and network reads say after a reap (2.2553.1 preview tools, verbatim).
const RECLAIMED_NOTE = "Preview view was reclaimed while hidden, so its earlier console and network output is gone. Interact with the preview (navigate or screenshot) and re-read to collect fresh entries.";
// eslint-disable-next-line no-control-regex
const stripAnsi = (text) => String(text).replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const push = (list, entry, limit) => { list.push(entry); if (list.length > limit) list.splice(0, list.length - limit); };
// A file the preview downloaded from the web carries macOS's quarantine flag (Gatekeeper checks it before it opens),
// as a browser's download would; one the file already has is kept.
function quarantine(file) {
  if (process.platform !== "darwin") return;
  try { if (!fs.lstatSync(file).isFile()) return; } catch { return; }
  execFile("/usr/bin/xattr", ["-p", "com.apple.quarantine", file], { timeout: 5000 }, (missing) => {
    if (!missing) return;
    execFile("/usr/bin/xattr", ["-w", "com.apple.quarantine", `0081;${Math.floor(Date.now() / 1000).toString(16)};OpenClaude Desktop;`, file], { timeout: 5000 }, () => {});
  });
}

/**
 * The Preview pane chord a key press inside the previewed page stands for (an Electron before-input-event input), else
 * null: "sketch" ⇧⌘X (Annotate), "close" ⌘W (close the preview), "address" ⌘L (the address field). Ctrl stands in for
 * ⌘ off macOS, as the pane's own keydown takes either.
 */
function previewShortcut(input) {
  if (!input || input.type !== "keyDown" || input.isAutoRepeat || input.alt) return null;
  const command = process.platform === "darwin" ? input.meta && !input.control : input.control && !input.meta;
  if (!command) return null;
  const key = String(input.key ?? "").toLowerCase();
  if (key === "x" && input.shift) return "sketch";
  if (key === "s" && input.shift && !input.isComposing && input.keyCode !== 229) return "selection";
  if (key === "w" && !input.shift) return "close";
  if (key === "l" && !input.shift) return "address";
  if (key === "t" && !input.shift) return "new-tab";
  return null;
}

function portAnswers(port, host, timeout = 600, netApi = net) {
  return new Promise((resolve) => {
    const socket = netApi.connect({ port, host });
    const done = (value) => { socket.destroy(); resolve(value); };
    socket.setTimeout(timeout, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}
// The port a dev server gets (2.42304.0 I2i: the configured one, else the next free one, else an OS-assigned one) comes
// from the original policy (r3b-preview-host.mjs → generated/r3b-preview-ports.mjs), not from a local probe.

/**
 * @param {object} options
 * @param {object} options.electron            { WebContentsView, BrowserWindow, session, shell, nativeTheme }
 * @param {(id: string) => ({id: string, cwd: string}|null)} options.getSession   a known session and its folder
 * @param {() => Promise<object>} [options.spawnEnv]   the environment dev servers get
 * @param {(event: object) => void} [options.broadcast] an app-wide event (every window)
 * @param {string|null} [options.frameDir]   where each session's last dev-server page frame is kept across a restart
 */
function createPreviewService({ electron, getSession, spawnEnv = async () => ({ ...process.env }), broadcast = () => {}, logger = console, home = process.env.HOME || "", hostWindow = null, reapHiddenMs = REAP_HIDDEN_MS,
  keepCookies = () => false, setKeepCookies = () => {}, getStorageMode = () => undefined, setStorageMode = () => {}, isCoworkSession = () => false, getStoredPartitions = () => [], setStoredPartitions = () => {},
  frameDir = null, getAllowedOrigins = () => [], setAllowedOrigins = () => {},
  // R3b-preview seams (tests pass stand-ins; no real port, process or lsof): the sockets the port policy and readiness
  // use, how a command starts, the native process calls (hostProcessInfo: lsof / ps), GrowthBook 2711562102, the
  // policy's retry delay.
  net: netApi = net, spawnProcess = spawn, processInfo = previewHost.hostProcessInfo(), autoPortGate = () => previewHost.AUTO_PORT_GATE_DEFAULT, portWait = sleep }) {
  const { WebContentsView, BrowserWindow, session: electronSession, shell, nativeTheme } = electron;
  // The window a renderer request came from (main.cjs: window-registry hostWindow(sender), which knows every main
  // window and pane popout); both split sides of a window are one webContents, so a side's pane rect is a region of it.
  const windowOf = typeof hostWindow === "function" ? hostWindow : (sender) => BrowserWindow.fromWebContents(sender);
  const previews = new Map(); // session id → active tab
  const subscriberCleanup = new Map(); // one destruction hook per renderer, across its sessions
  const closedTabs = new Map(); // current-source WZ: at most 25 URLs per session / 50 sessions
  const allPreviews = () => [...previews.values()].flatMap(entry => [...entry.group.tabs.values()]);
  const servers = new Map(); // cwd \0 name → server
  const launchCache = new Map(); // cwd → { mtime, parsed }
  // The original's a2.servers rows for the port policy (r3b-preview-host.mjs): command servers only (an attach entry
  // runs nothing), a server still choosing its port holds none yet (its reservation does), and a server's "session" is
  // its folder (one folder's servers are shared by its chats). serverId is the name preview_stop takes here.
  const registryView = (exclude = null) => [...servers.values()].filter((server) => server !== exclude && !server.attach).map((server) => ({
    serverId: server.name, name: server.name, port: server.allocating ? undefined : server.port, status: server.status, cwd: server.cwd, sessionId: server.cwd, local: server,
  }));
  const ports = previewHost.createPreviewPortHost({ registry: () => registryView(), logger, netApi, wait: portWait, processes: processInfo, autoPortGate });
  const portOpen = async (port) => (await portAnswers(port, "127.0.0.1", 600, netApi)) || (await portAnswers(port, "::1", 600, netApi));
  // R4e-preview (preview-15): each tab's frame and geometry at the agent's last screenshot (r4e-preview-coordinates.mjs).
  const coordinates = createPreviewCoordinateGuard({ geometry: (entry) => viewportGeometry(entry) });
  const listening = new WeakSet(); // page contents whose debugger events are wired
  let parking = null;
  const partitionsReady = new Set();
  let selectedStorageMode = previewStorageMode(getStorageMode(), keepCookies());
  const storageMode = () => selectedStorageMode;
  const keeping = () => storageMode() !== "none";
  const storageFor = entry => previewStoragePartition({ mode: storageMode(), sessionId: entry.id, cwd: entry.cwd, cowork: isCoworkSession(entry.id) });
  const storedPartitions = new Set((getStoredPartitions() ?? []).filter(name => /^persist:preview-session-[a-f0-9]{64}$/.test(name)));
  // Original hri/Iei startup policy: Until quit clears prior Code session jars;
  // the Cowork/shared jar is explicitly preserved.
  const storageReady = selectedStorageMode === 'none' ? Promise.all([...storedPartitions].map(async name => {
    try {
      const ses = electronSession.fromPartition(name);
      if (ses.clearData) await ses.clearData();
      else { await ses.clearStorageData(); await ses.clearCache?.(); }
      await ses.clearAuthCache?.();
      storedPartitions.delete(name);
    } catch (error) { logger.warn?.('preview: startup session-data clear failed', error); }
  })).then(() => setStoredPartitions([...storedPartitions])) : Promise.resolve();

  // ------------------------------------------------------------------ partition
  function partition(name) {
    const ses = electronSession.fromPartition(name);
    if (partitionsReady.has(name)) return ses;
    partitionsReady.add(name);
    const localOrigin = (value) => { try { return launch.isLocalHost(new URL(value).hostname); } catch { return false; } };
    ses.setPermissionRequestHandler((_contents, permission, callback, details) => callback(permission === "clipboard-sanitized-write" && localOrigin(details?.requestingUrl)));
    ses.setPermissionCheckHandler((_contents, permission, origin) => permission === "clipboard-sanitized-write" && localOrigin(origin));
    // preview-12 (2.42304.0 Pfi): sites see a plain browser user agent; Claude's own hosts get the app's, minus Electron.
    previewHost.applyPreviewUserAgent(ses, { logger });
    // Downloads (2.2553.1 lets preview downloads run): a page shown in a pane gets the system Save dialog over that
    // window, starting in Downloads, and the saved file is quarantined like a browser download. A page nobody sees
    // (parked, or the agent's unseen page) can't put a dialog in front of anyone: the download is cancelled, and the
    // page's console and the agent's next result say why.
    ses.on("will-download", (event, item, contents) => {
      const owner = allPreviews().find((preview) => alive(preview) && preview.view.webContents.id === contents?.id) ?? null;
      let file = "download";
      try { file = path.basename(String(item?.getFilename?.() || "")) || "download"; } catch { /* keep the fallback */ }
      if (!owner || !holder(owner)) {
        event.preventDefault();
        if (owner) {
          owner.download = { file, state: "cancelled", reason: "not-shown", at: Date.now() };
          push(owner.console, { level: "warn", text: `OpenClaude Desktop didn’t download ${file}: the preview isn’t on screen, so there was nowhere to ask where to save it. Show the Preview pane and try again.`, url: owner.url, line: null, time: Date.now() }, CONSOLE_LIMIT);
          notify(owner);
        }
        return;
      }
      try { item.setSaveDialogOptions?.({ defaultPath: path.join(home || os.homedir(), "Downloads", file) }); } catch { /* Electron's own default */ }
      owner.download = { file, state: "saving", at: Date.now() };
      notify(owner);
      item.once?.("done", (_event, state) => {
        let saved = "";
        try { saved = item.getSavePath?.() || ""; } catch { saved = ""; }
        owner.download = { file: saved ? path.basename(saved) : file, state: state === "completed" ? "completed" : state === "interrupted" ? "failed" : "cancelled", at: Date.now(), ...(state === "completed" && saved ? { path: saved } : {}) };
        if (state === "completed" && saved) {
          let chain = [];
          try { chain = item.getURLChain?.() || []; } catch { chain = []; }
          if (!(chain.length ? chain : [item.getURL?.() || ""]).every((url) => /^file:/i.test(url))) quarantine(saved);
        }
        notify(owner);
      });
    });
    // One listener per session (Electron keeps only the last): file:// loads (pages, frames, images) only from the folder
    // of the session whose page asks; and a local file page the agent drives (often one it wrote) reaches no outside
    // host the user hasn't allowed in this session, so a page can't carry the workspace out where the agent's own
    // sandbox couldn't (its top-level navigations and popups are held the same way: holdOutside).
    ses.webRequest.onBeforeRequest({ urls: ["file://*/*", "http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (details, callback) => {
      const owner = allPreviews().find((preview) => preview.view && !preview.view.webContents.isDestroyed() && preview.view.webContents.id === details.webContentsId);
      if (/^file:/i.test(details.url)) {
        let file = "";
        try { file = decodeURIComponent(new URL(details.url).pathname); } catch { /* invalid */ }
        callback({ cancel: !owner || !launch.insideFolderReal(owner.cwd, file) });
        return;
      }
      callback({ cancel: !!owner && details.resourceType !== "mainFrame" && outsideFromAgentFile(owner, details.url) });
    });
    return ses;
  }

  function parkingWindow() {
    if (parking && !parking.isDestroyed()) return parking;
    parking = new BrowserWindow({ show: false, width: 1280, height: 800, skipTaskbar: true, paintWhenInitiallyHidden: true, webPreferences: { backgroundThrottling: false, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    parking.on("closed", () => { parking = null; });
    return parking;
  }

  // ------------------------------------------------------------------ previews
  function preview(sessionId, createTab = false) {
    const active = previews.get(sessionId);
    if (active && !createTab) return active;
    let entry;
    const group = active?.group ?? { tabs: new Map(), subscribers: new Set(), approvedHosts: new Set(), declinedHosts: new Set(), asking: new Set(), approvedServers: new Set(), recentFiles: [] };
    const known = getSession(sessionId);
    if (!known?.cwd) throw new Error("Unknown session.");
    entry = {
      id: sessionId, tabId: crypto.randomUUID(), group, placeholder: !createTab, faviconUrl: null, cwd: known.cwd, view: null, host: null, paneBounds: null, visible: false, occluded: false, subscribers: new Set(),
      url: "", title: "", loading: false, error: null, crashed: false,
      viewport: { preset: "responsive", width: null, height: null, colorScheme: "system", setByAgent: false },
      console: [], network: [], requests: new Map(), approvedHosts: new Set(), debugger: false, notifyTimer: null, lastServer: null,
      reapTimer: null, reclaimed: false,
      // Servers & settings › Files: the HTML files of the session folder this preview showed, newest first.
      recentFiles: [],
      // The agent's sites: declined ones are never asked about again in this session; agentDriven while the agent last
      // opened or drove the page (the user's own address-bar navigation hands it back), when the page's own
      // navigations to outside sites need the same approval; siteApproval asks for those; blocked is the last one held.
      declinedHosts: new Set(), asking: new Set(), agentDriven: false, siteApproval: null, blocked: null, blockWaiters: new Set(),
      // launch.json commands the agent may start in this session (a fingerprint of each approved configuration).
      approvedServers: new Set(),
      // The page's latest download: { file, state: "saving"|"completed"|"failed"|"cancelled", reason?, at }.
      download: null,
    };
    for (const key of ['subscribers', 'approvedHosts', 'declinedHosts', 'asking', 'approvedServers', 'recentFiles'])
      Object.defineProperty(entry, key, { get: () => group[key], set: value => { group[key] = value; }, enumerable: true, configurable: true });
    group.tabs.set(entry.tabId, entry);
    if (!active) previews.set(sessionId, entry);
    return entry;
  }
  const alive = (entry) => entry?.view && !entry.view.webContents.isDestroyed();
  // The pane showing the page right now (2.2553.1 claimantId): hidden, covered or gone, it holds nothing.
  const holder = (entry) => {
    const host = entry.host;
    return host && entry.visible && !entry.occluded && host.sender && !host.sender.isDestroyed() && host.window && !host.window.isDestroyed() ? host : null;
  };
  // Pages the reaper may close: local dev servers and the session's files (2.2553.1 reaps port and static-content
  // previews, never an outside site), which come back by loading the same address.
  const reclaimable = (url) => {
    try { const parsed = new URL(url); return parsed.protocol === "file:" || (/^https?:$/.test(parsed.protocol) && launch.isLocalHost(parsed.hostname)); } catch { return false; }
  };
  // A page nobody shows is closed after reapHiddenMs; showing it cancels that, the agent using it starts the wait again.
  function armReap(entry, renew = false) {
    if (!alive(entry) || holder(entry)) { clearTimeout(entry.reapTimer); entry.reapTimer = null; return; }
    if (entry.reapTimer && !renew) return;
    clearTimeout(entry.reapTimer);
    entry.reapTimer = setTimeout(() => reap(entry), reapHiddenMs);
    entry.reapTimer.unref?.();
  }
  function reap(entry) {
    entry.reapTimer = null;
    if (entry.group.tabs.get(entry.tabId) !== entry || !alive(entry) || holder(entry)) return;
    const view = entry.view;
    if (!reclaimable(view.webContents.getURL() || entry.url)) return;
    stopSelection(entry, true);
    try { if (entry.parent && !entry.parent.isDestroyed()) entry.parent.contentView.removeChildView(view); } catch { /* already gone */ }
    Object.assign(entry, { view: null, parent: null, debugger: false, loading: false, crashed: false, reclaimed: true, console: [], network: [], requests: new Map() });
    try { view.webContents.close(); } catch { /* gone */ }
    logger.info?.(`preview: closed the hidden page of ${entry.id}; it reopens at ${entry.url} when shown`);
    notify(entry);
  }
  // A reaped page reopens at its address (2.2553.1 xX recreates the context from the server).
  const revive = (entry) => (!alive(entry) && entry.reclaimed && entry.url ? navigate(entry.id, entry.url, { tabId: entry.tabId }) : Promise.resolve(null));

  function tabEntry(sessionId, tabId) {
    const entry = preview(sessionId).group.tabs.get(tabId);
    if (!entry) throw new Error("Unknown preview tab.");
    return entry;
  }
  function activateTab(sessionId, tabId) {
    const previous = preview(sessionId), next = tabEntry(sessionId, tabId);
    if (previous === next) return snapshot(next);
    stopSelection(previous);
    const placement = { host: previous.host, paneBounds: previous.paneBounds, visible: previous.visible, occluded: previous.occluded };
    previous.host = null; previous.visible = false; place(previous);
    previews.set(sessionId, next);
    Object.assign(next, placement);
    place(next); applyEmulation(next).catch(() => {}); revive(next).catch(() => {});
    notify(next, true);
    return snapshot(next);
  }
  function newTab(sessionId) {
    const active = preview(sessionId);
    active.group.lastTabClosed = false;
    if (active.placeholder && active.group.tabs.size === 1) { active.placeholder = false; notify(active, true); return snapshot(active); }
    // Current c224804cc U: the create button is disabled when count > 8.
    if (active.group.tabs.size > 8) throw new Error("Close a preview tab before opening another.");
    const next = preview(sessionId, true);
    return activateTab(sessionId, next.tabId);
  }
  function rememberClosedTab(entry) {
    // Original rememberClosedTab stores web URLs only; blank/file tabs are not reopenable.
    if (!/^https?:\/\//i.test(entry.url)) return;
    const previous = closedTabs.get(entry.id);
    const urls = previous?.cwd === entry.cwd ? previous.urls : [];
    urls.push(entry.url); if (urls.length > closedTabsPerSession) urls.shift();
    closedTabs.delete(entry.id);closedTabs.set(entry.id, { cwd: entry.cwd, urls });
    if (closedTabs.size > closedTabSessions) closedTabs.delete(closedTabs.keys().next().value);
  }
  function reopenTab(sessionId) {
    const entry = preview(sessionId), history = closedTabs.get(sessionId);
    if (history && (history.cwd !== entry.cwd || getSession(sessionId)?.cwd !== history.cwd)) { closedTabs.delete(sessionId);return { ...snapshot(entry), reopened: false }; }
    if (!history?.urls.length || [...entry.group.tabs.values()].filter(tab => !tab.placeholder).length > 8) return { ...snapshot(entry), reopened: false };
    const url = history.urls.pop();if (!history.urls.length) closedTabs.delete(sessionId);
    const state = newTab(sessionId), next = tabEntry(sessionId, state.activeTabId);
    next.agentDriven = false;
    // A user-requested reopen creates a fresh page at the saved URL, not a persisted browser history.
    void navigate(sessionId, url, { tabId: next.tabId }).catch(error => { if (next.group.tabs.has(next.tabId)) { next.error = { code: 'reopen', description: error.message, url }; notify(next); } });
    notify(next, true);return { ...snapshot(next), reopened: true };
  }
  function selectTabIndex(sessionId, index) {
    if (!Number.isInteger(index) || index < -1 || index > 7) throw new Error("Unknown preview tab position.");
    const entry = preview(sessionId), tabs = [...entry.group.tabs.values()].filter(tab => !tab.placeholder);
    const tab = tabs.at(index);return tab ? activateTab(sessionId, tab.tabId) : snapshot(entry);
  }
  function cycleTab(sessionId, direction) {
    if (direction !== 1 && direction !== -1) throw new Error("Unknown operation.");
    const entry = preview(sessionId), tabs = [...entry.group.tabs.values()].filter(tab => !tab.placeholder);
    const now = Date.now();
    if (tabs.length < 2 || now - (entry.group.lastCycleAt ?? 0) < 60) return snapshot(entry);
    entry.group.lastCycleAt = now;
    return activateTab(sessionId, tabs[(tabs.indexOf(entry) + direction + tabs.length) % tabs.length].tabId);
  }
  function closePlan(sessionId, tabId, others = false) {
    const entry = tabEntry(sessionId, tabId), tabs = [...entry.group.tabs.values()];
    const closing = tabs.filter(tab => others ? tab.tabId !== tabId : tab.tabId === tabId);
    const remaining = tabs.filter(tab => !closing.includes(tab));
    const uses = (tab, server) => { try { const url = new URL(tab.url); return launch.isLocalHost(url.hostname) && Number(url.port) === server.port; } catch { return false; } };
    const processes = [...servers.values()].filter(server => server.cwd === entry.cwd && ['running', 'starting'].includes(server.status)
      && closing.some(tab => uses(tab, server)) && !remaining.some(tab => uses(tab, server)));
    return { entry, tabs, closing, remaining, processes };
  }
  async function closeTab(sessionId, tabId, { others = false, decision = null } = {}) {
    if (decision !== null && decision !== 'keep' && decision !== 'stop') throw new Error("Unknown operation.");
    let plan = closePlan(sessionId, tabId, others);
    if (plan.processes.length && decision === null) return { confirmation: { tabId, others, processes: plan.processes.map(serverView) } };
    if (decision === 'stop') {
      for (const server of plan.processes) await stopServer(sessionId, server.name);
      // Another pane can change tabs while the child process exits. Close only the original
      // targets still present; never include a newly created tab in a pending Close others.
      const current = preview(sessionId), tabs = [...current.group.tabs.values()];
      const closing = tabs.filter(tab => plan.closing.includes(tab));
      plan = { ...plan, tabs, closing, remaining: tabs.filter(tab => !closing.includes(tab)) };
    }
    const active = preview(sessionId), wasActive = plan.closing.includes(active);
    const lastTabClosed = plan.remaining.length === 0;
    let selected = plan.remaining.includes(active) ? active : plan.remaining[Math.min(plan.tabs.indexOf(plan.entry), plan.remaining.length - 1)];
    if (!selected) { selected = preview(sessionId, true); selected.placeholder = true; }
    if (wasActive) activateTab(sessionId, selected.tabId);
    for (const tab of plan.closing) {
      stopSelection(tab, true);
      rememberClosedTab(tab);
      tab.group.tabs.delete(tab.tabId);clearTimeout(tab.notifyTimer);clearTimeout(tab.reapTimer);
      if (alive(tab)) { try { tab.parent?.contentView.removeChildView(tab.view); tab.view.webContents.close(); } catch {} }
      tab.view = null;tab.host = null;
    }
    preview(sessionId).group.lastTabClosed = lastTabClosed;
    notify(preview(sessionId), true);
    return { ...snapshot(preview(sessionId)), lastTabClosed };
  }
  function reorderTab(sessionId, tabId, toIndex) {
    const entry = tabEntry(sessionId, tabId), tabs = [...entry.group.tabs.values()];
    if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= tabs.length) throw new Error("Unknown preview tab position.");
    tabs.splice(tabs.indexOf(entry), 1);tabs.splice(toIndex, 0, entry);
    entry.group.tabs = new Map(tabs.map(tab => [tab.tabId, tab]));notify(preview(sessionId), true);return snapshot(preview(sessionId));
  }

  // ------------------------------------------------------------------ outside sites
  // B39 Allowed sites (preview-allowed-origins.mjs): an outside site on the saved list needs no approval, in any
  // session; the session's own approvals (approvedHosts) still count as before.
  const savedAllows = (url) => { try { return allowedOrigins.originAllowed(getAllowedOrigins(), url); } catch { return false; } };
  const siteAllowed = (entry, host, url) => entry.approvedHosts.has(host) || savedAllows(url);
  const outsideHost = (url) => {
    try { const parsed = new URL(url); return /^https?:$/.test(parsed.protocol) && !launch.isLocalHost(parsed.hostname) ? parsed.host : null; } catch { return null; }
  };
  const declinedText = (host) => `The user didn’t allow opening ${host} in the preview. Only localhost pages open without asking.`;
  /** A subresource an agent-driven local file page asks for from an outside host this session hasn't allowed (blocked). */
  function outsideFromAgentFile(entry, url) {
    if (!entry.agentDriven) return false;
    let page = "";
    try { page = entry.view.webContents.getURL(); } catch { return false; }
    if (!/^file:/i.test(page)) return false;
    let host = null;
    try { const parsed = new URL(url); host = /^(https?|wss?):$/.test(parsed.protocol) && !launch.isLocalHost(parsed.hostname) ? parsed.host : null; } catch { return false; }
    if (!host || siteAllowed(entry, host, url)) return false;
    push(entry.console, { level: "warn", text: `OpenClaude Desktop blocked a request to ${host}: a local file page the agent drives reaches only localhost and sites allowed in this session.`, url: page, line: null, time: Date.now() }, CONSOLE_LIMIT);
    return true;
  }
  /**
   * A navigation or popup the page itself starts while the agent drives it, to an outside host this session hasn't
   * allowed: held (true) — a declined host stays blocked, any other is asked about once, then opened if allowed.
   */
  function holdOutside(entry, url) {
    if (!entry.agentDriven) return false;
    const host = outsideHost(url);
    if (!host || siteAllowed(entry, host, url)) return false;
    entry.blocked = { host, url, at: Date.now(), declined: entry.declinedHosts.has(host) };
    if (!entry.declinedHosts.has(host)) void askOutside(entry, host, url);
    else blockedFor(entry, host);
    return true;
  }
  // A navigation call waiting on a page the user kept from an outside site ends at once instead of timing out.
  const blockedFor = (entry, host) => { for (const waiter of [...entry.blockWaiters]) { try { waiter(host); } catch { /* best effort */ } } };
  async function askOutside(entry, host, url, load = true) {
    if (entry.asking.has(host)) return;
    if (typeof entry.siteApproval !== "function") { entry.declinedHosts.add(host); return; }
    entry.asking.add(host);
    let ok = false;
    try { ok = (await entry.siteApproval({ kind: "preview-site", host, url })) === true; } catch { ok = false; }
    entry.asking.delete(host);
    if (!ok) { entry.declinedHosts.add(host); if (entry.blocked?.host === host) entry.blocked = { ...entry.blocked, declined: true }; blockedFor(entry, host); return; }
    entry.approvedHosts.add(host);
    entry.declinedHosts.delete(host);
    if (entry.blocked?.host === host) entry.blocked = null;
    if (load && alive(entry)) entry.view.webContents.loadURL(url).catch(() => {});
    return true;
  }

  function ensureView(entry) {
    if (alive(entry)) return entry.view;
    entry.storagePartition = storageFor(entry);
    if (entry.storagePartition.startsWith('persist:preview-session-') && !storedPartitions.has(entry.storagePartition)) {
      storedPartitions.add(entry.storagePartition);setStoredPartitions([...storedPartitions]);
    }
    const view = new WebContentsView({
      webPreferences: {
        session: partition(entry.storagePartition), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false,
        backgroundThrottling: false, disableDialogs: true, plugins: false, spellcheck: false, navigateOnDragDrop: false, safeDialogs: true,
      },
    });
    view.setBackgroundColor("#ffffff");
    entry.view = view;
    entry.crashed = false;
    entry.reclaimed = false;
    const contents = view.webContents;
    // State events of a page the reaper closed never reach the entry's next page.
    const mine = (fn) => (...args) => { if (entry.view === view) fn(...args); };
    const guard = (event, url) => {
      const allowed = launch.navigationAllowed(url, entry.cwd);
      if (!allowed.ok) { event.preventDefault(); entry.error = { code: "blocked", description: allowed.reason, url }; notify(entry); return; }
      // A page the agent drives never leaves for an outside site the user hasn't allowed in this session.
      if (holdOutside(entry, allowed.url)) event.preventDefault();
    };
    contents.on("will-navigate", guard);
    contents.on("will-redirect", guard);
    contents.on("will-frame-navigate", (event) => { if (!event.isMainFrame) { const allowed = launch.navigationAllowed(event.url, entry.cwd); if (!allowed.ok && !/^(data|blob|about):/.test(event.url)) event.preventDefault(); } });
    // A page popup becomes a new preview tab, retaining its originator’s approval boundary.
    contents.setWindowOpenHandler(({ url }) => {
      const allowed = launch.navigationAllowed(url, entry.cwd);
      if (allowed.ok) setImmediate(async () => {
        try {
          const host = outsideHost(allowed.url);
          if (entry.agentDriven && host && !siteAllowed(entry, host, allowed.url)) {
            if (entry.declinedHosts.has(host) || !(await askOutside(entry, host, allowed.url, false))) return;
          }
          if (!alive(entry) || entry.group.tabs.get(entry.tabId) !== entry) return;
          const state = newTab(entry.id), next = tabEntry(entry.id, state.activeTabId);
          next.popup = true;
          next.agentDriven = entry.agentDriven; next.siteApproval = entry.siteApproval;
          await navigate(entry.id, allowed.url, { tabId: next.tabId });
        } catch (error) { logger.warn?.(`preview: could not open a tab: ${error.message}`); }
      });
      return { action: "deny" };
    });
    contents.on("did-start-loading", mine(() => { stopSelection(entry);entry.loading = true; entry.error = null; notify(entry); }));
    contents.on("did-stop-loading", mine(() => { entry.loading = false; notify(entry); }));
    contents.on("did-navigate", mine((_event, url) => { entry.url = url; entry.title = contents.getTitle(); notify(entry); }));
    contents.on("did-navigate-in-page", mine((_event, url, isMainFrame) => { if (isMainFrame) { stopSelection(entry);entry.url = url; notify(entry); } }));
    contents.on("page-favicon-updated", mine((_event, urls) => { entry.faviconUrl = (urls || []).find(url => /^https?:/i.test(url)) ?? null; notify(entry); }));
    contents.on("page-title-updated", mine((_event, title) => { entry.title = title; notify(entry); }));
    contents.on("did-fail-load", mine((_event, code, description, url, isMainFrame) => {
      if (!isMainFrame || code === -3) return; // -3: aborted by a newer navigation
      entry.error = { code: String(code), description, url };
      entry.url = url || entry.url;
      notify(entry);
    }));
    contents.on("render-process-gone", mine((_event, details) => { stopSelection(entry, true);entry.crashed = true; entry.error = { code: "crashed", description: details?.reason || "crashed", url: entry.url }; notify(entry); }));
    contents.on("devtools-opened", () => notify(entry));
    contents.on("devtools-closed", () => notify(entry));
    // F6 / Ctrl+F6 leave the page for the app (the pane's skip link explains it). The pane's own chords also work
    // while focus is in the page, which the host window never sees (2.2553.1 PreviewContext before-input-event:
    // previewSketchShortcut ⇧⌘X, previewCloseShortcut ⌘W, previewAddressBarShortcut ⌘L): the host pane acts on them.
    contents.on("before-input-event", (event, input) => {
      if (input.type !== "keyDown") return;
      if (input.key === 'Escape' && !input.isComposing && input.keyCode !== 229 && entry.selection?.enabled) {
        event.preventDefault();stopSelection(entry);return;
      }
      const sender = entry.host?.sender;
      if (input.key === "F6") {
        event.preventDefault();
        if (sender && !sender.isDestroyed()) { sender.focus(); sender.send("desktop:event", { kind: "preview-focus-out", sessionId: entry.id, instanceId: entry.host.instanceId }); }
        return;
      }
      const tabCommand = previewTabKeyCommand({ ...input, syntheticSuppressed: Date.now() < (entry.group.syntheticInputUntil ?? 0) }, process.platform === "darwin");
      if (tabCommand) {
        event.preventDefault();
        if (tabCommand.action === 'select-tab') selectTabIndex(entry.id, tabCommand.index);
        else if (tabCommand.action === 'cycle-tab') cycleTab(entry.id, tabCommand.direction);
        else if (tabCommand.action === 'reopen-tab') reopenTab(entry.id);
        return;
      }
      const action = previewShortcut(input);
      if (!action || !sender || sender.isDestroyed()) return;
      event.preventDefault();
      sender.focus();
      sender.send("desktop:event", { kind: "preview-shortcut", action, sessionId: entry.id, instanceId: entry.host.instanceId });
    });
    attachDebugger(entry);
    place(entry);
    return view;
  }

  function attachDebugger(entry) {
    const contents = entry.view.webContents;
    if (entry.debugger && contents.debugger.isAttached()) return;
    try { if (!contents.debugger.isAttached()) contents.debugger.attach("1.3"); } catch (error) { logger.warn?.(`preview: debugger unavailable: ${error.message}`); return; }
    entry.debugger = true;
    // Once per page: a re-attach (after the developer tools let go) keeps the listeners it already has.
    if (listening.has(contents)) { for (const domain of ["Runtime.enable", "Log.enable", "Network.enable", "Page.enable"]) contents.debugger.sendCommand(domain).catch(() => {}); applyEmulation(entry).catch(() => {}); return; }
    listening.add(contents);
    contents.debugger.on("detach", () => { if (entry.view?.webContents === contents) entry.debugger = false; });
    contents.debugger.on("message", (_event, method, params) => {
      if (entry.view?.webContents !== contents) return;
      if (method === 'Overlay.inspectNodeRequested') {
        if (params.backendNodeId) entry.elementInspector?.inspectModeCallback?.(params.backendNodeId);
        return;
      }
      if (method === "Runtime.consoleAPICalled") {
        const text = (params.args || []).map((arg) => arg.value !== undefined ? (typeof arg.value === "string" ? arg.value : JSON.stringify(arg.value)) : arg.description ?? arg.type).join(" ");
        if (/^%cElectron Security Warning/.test(text)) return;
        const frame = params.stackTrace?.callFrames?.[0];
        push(entry.console, { level: { warning: "warn", assert: "error" }[params.type] ?? params.type, text: text.slice(0, 4000), url: frame?.url || "", line: frame ? frame.lineNumber + 1 : null, time: Date.now() }, CONSOLE_LIMIT);
      } else if (method === "Runtime.exceptionThrown") {
        const details = params.exceptionDetails || {};
        push(entry.console, { level: "error", text: String(details.exception?.description || details.text || "Uncaught exception").slice(0, 4000), url: details.url || "", line: details.lineNumber != null ? details.lineNumber + 1 : null, time: Date.now() }, CONSOLE_LIMIT);
      } else if (method === "Page.javascriptDialogOpening") {
        // The page's alert() / confirm() / prompt() never shows (disableDialogs): its console and the agent's next click
        // or key press result say so, and what the call returned, as Claude Desktop's browser does ("Page dialog
        // suppressed"), so an agent testing a confirm()-guarded button doesn't think the button is broken.
        const type = typeof params.type === "string" ? params.type : "unknown";
        if (type === "alert" || type === "confirm" || type === "prompt") {
          const message = String(params.message ?? "").slice(0, 200);
          const returned = { confirm: "confirm() returned false to the page", prompt: "prompt() returned null to the page" }[type] ?? "the call returned immediately";
          push(entry.console, { level: "warn", text: `[OpenClaude Desktop preview] Page dialog suppressed (${type}): ${JSON.stringify(message)} — native JavaScript dialogs are disabled in this browser; ${returned}.`,
            url: String(params.url || "").slice(0, 2000), line: null, time: Date.now() }, CONSOLE_LIMIT);
          entry.dialog = { type, message, returned, at: Date.now() };
        }
      } else if (method === "Log.entryAdded") {
        const { level, text, url } = params.entry || {};
        push(entry.console, { level: level === "warning" ? "warn" : level || "info", text: String(text || "").slice(0, 4000), url: url || "", line: null, time: Date.now() }, CONSOLE_LIMIT);
      } else if (method === "Network.requestWillBeSent") {
        const record = { id: params.requestId, method: params.request?.method, url: String(params.request?.url || "").slice(0, 2000), type: params.type || "", status: null, mimeType: "", failed: null, time: Date.now() };
        entry.requests.set(params.requestId, record);
        push(entry.network, record, NETWORK_LIMIT);
        if (entry.requests.size > NETWORK_LIMIT * 2) for (const key of [...entry.requests.keys()].slice(0, NETWORK_LIMIT)) entry.requests.delete(key);
      } else if (method === "Network.responseReceived") {
        const record = entry.requests.get(params.requestId);
        if (record) { record.status = params.response?.status ?? null; record.mimeType = params.response?.mimeType || ""; }
      } else if (method === "Network.loadingFailed") {
        const record = entry.requests.get(params.requestId);
        if (record) record.failed = params.canceled ? "canceled" : params.errorText || "failed";
      }
    });
    // Not awaited: the commands settle once the page's renderer exists (awaiting them before the first load hangs).
    for (const domain of ["Runtime.enable", "Log.enable", "Network.enable", "Page.enable"]) contents.debugger.sendCommand(domain).catch(() => {});
    applyEmulation(entry).catch(() => {});
  }
  function cdp(entry, method, params) {
    if (!alive(entry)) return Promise.reject(new Error("Nothing is open in the preview."));
    attachDebugger(entry);
    if (!entry.view.webContents.debugger.isAttached()) return Promise.reject(new Error("The page can’t be inspected while its developer tools hold it. Close them and try again."));
    return entry.view.webContents.debugger.sendCommand(method, params);
  }
  function stopSelection(entry, dispose = false) {
    const picker = entry.picker;
    if (!picker) return;
    if (dispose) {
      entry.picker = null;entry.elementInspector = null;
      picker.dispose().catch(() => {});
    } else if (entry.selection?.enabled || entry.selection?.busy) picker.setEnabled(false).catch(() => {});
  }
  async function selectElement(sender, { sessionId, instanceId, enabled } = {}) {
    const entry = preview(sessionId), owner = entry.host;
    if (!owner || owner.sender !== sender || owner.instanceId !== instanceId || (enabled === true && !entry.visible) || !alive(entry)) throw new Error('This pane does not own the preview.');
    entry.selectionOwner = owner;
    if (!entry.picker) {
      const contents = entry.view.webContents;
      const valid = () => alive(entry) && !entry.crashed && entry.view.webContents === contents && previews.get(entry.id) === entry && entry.host?.sender === entry.selectionOwner?.sender && entry.host?.instanceId === entry.selectionOwner?.instanceId && entry.visible && !entry.host?.sender.isDestroyed();
      entry.elementInspector = createPreviewElementInspector({
        webContents: contents,
        ensureAttached() { if (!alive(entry) || entry.view.webContents !== contents) throw new Error('The preview tab was closed.');attachDebugger(entry); },
        sendCommand: (method, params) => { if (!alive(entry) || entry.view.webContents !== contents) return Promise.reject(new Error('The preview tab was closed.'));return cdp(entry, method, params); },
        emulationScale: () => viewRect(entry)?.scale ?? 1,
        logger: { debug() {}, error: (_message, data) => logger.warn?.(`preview element: ${data?.error?.message || 'capture failed'}`) },
      });
      entry.picker = createPreviewSelection({
        inspector: entry.elementInspector, isCurrent: valid,
        onState(state) { entry.selection = state;notify(entry); },
        onError: error => logger.warn?.(`preview element: ${error.message}`),
        onSelected(context) {
          if (!valid()) return;
          entry.selectionOwner.sender.send('desktop:event', { kind: 'preview-element-selected', sessionId: entry.id, instanceId: entry.selectionOwner.instanceId, tabId: entry.tabId, url: entry.url, context });
        },
      });
    }
    await entry.picker.setEnabled(enabled === true);
    return snapshot(entry);
  }

  // The view's rectangle inside the pane: the whole pane, or a preset device size scaled to fit and centred.
  function viewRect(entry) {
    const pane = entry.paneBounds;
    if (!pane) return null;
    const { preset, width, height } = entry.viewport;
    if (preset === "responsive" || !width || !height) return { ...pane, scale: 1 };
    const scale = Math.min(1, pane.width / width, pane.height / height);
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    return { x: pane.x + Math.round((pane.width - w) / 2), y: pane.y + Math.round((pane.height - h) / 2), width: w, height: h, scale };
  }
  // The page's emulated viewport, one rule for applyEmulation and viewportGeometry (R4f-preview-coords): responsive is the
  // pane's own size with no override (a page without a pane is laid out at place()'s 1280 × 800); a preset or custom
  // size is its CSS width × height at the fit-to-pane scale, a phone (under 768 px) at deviceScaleFactor 2, else the
  // display's own (0).
  function emulatedViewport(entry) {
    const { preset, width, height } = entry.viewport;
    const rect = viewRect(entry);
    if (preset === "responsive" || !width || !height) return { override: false, width: rect?.width ?? 1280, height: rect?.height ?? 800, scale: 1, deviceScaleFactor: 0, mobile: false };
    const mobile = width < 768;
    return { override: true, width, height, scale: rect?.scale ?? 1, deviceScaleFactor: mobile ? 2 : 0, mobile };
  }
  // preview-15: the page's viewport as applyEmulation sets it (CSS width × height, the emulation scale, deviceScaleFactor
  // with 0 the display's own). The preview never pinch-zooms, so its layout size is its size.
  function viewportGeometry(entry) {
    const { width, height, scale, deviceScaleFactor } = emulatedViewport(entry);
    return { width, height, scale, deviceScaleFactor, layoutWidth: width, layoutHeight: height };
  }
  async function applyEmulation(entry) {
    if (!alive(entry) || !entry.debugger) return;
    const { colorScheme } = entry.viewport;
    const metrics = emulatedViewport(entry);
    if (!metrics.override) {
      await cdp(entry, "Emulation.clearDeviceMetricsOverride").catch(() => {});
      await cdp(entry, "Emulation.setTouchEmulationEnabled", { enabled: false }).catch(() => {});
      await cdp(entry, "Emulation.setUserAgentOverride", { userAgent: entry.view.webContents.session.getUserAgent() }).catch(() => {});
    } else {
      const { width, height, deviceScaleFactor, mobile, scale } = metrics;
      await cdp(entry, "Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile, scale }).catch(() => {});
      await cdp(entry, "Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 }).catch(() => {});
      if (mobile) {
        const chrome = process.versions.chrome || "140.0.0.0";
        await cdp(entry, "Emulation.setUserAgentOverride", { userAgent: `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Mobile Safari/537.36`, platform: "Android" }).catch(() => {});
      }
    }
    await cdp(entry, "Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: colorScheme === "system" ? "" : colorScheme }] }).catch(() => {});
  }

  // Put the view where it belongs: over its pane in the host window, else parked.
  function place(entry) {
    armReap(entry);
    if (!entry.host || !entry.visible) stopSelection(entry);
    if (!alive(entry)) return;
    const view = entry.view;
    const hostWindow = entry.host?.window && !entry.host.window.isDestroyed() ? entry.host.window : null;
    const target = hostWindow ?? parkingWindow();
    if (entry.parent !== target) {
      try { if (entry.parent && !entry.parent.isDestroyed()) entry.parent.contentView.removeChildView(view); } catch { /* already gone */ }
      target.contentView.addChildView(view);
      entry.parent = target;
    }
    if (hostWindow && entry.paneBounds) {
      const rect = viewRect(entry);
      view.setBounds({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      view.setVisible(entry.visible && !entry.occluded);
    } else {
      const last = entry.paneBounds ? viewRect(entry) : { width: 1280, height: 800 };
      view.setBounds({ x: 0, y: 0, width: last.width, height: last.height });
      view.setVisible(true);
    }
  }
  const onScreen = (entry) => !!(entry.host?.window && !entry.host.window.isDestroyed() && entry.host.window.isVisible() && entry.visible && !entry.occluded && entry.parent === entry.host.window);

  // ------------------------------------------------------------------ renderer state
  function launchInfo(cwd) {
    const file = path.join(cwd, launch.LAUNCH_FILE);
    let stat = null;
    try { stat = fs.statSync(file); } catch { /* missing */ }
    const key = stat ? `${stat.mtimeMs}:${stat.size}` : "missing";
    const cached = launchCache.get(cwd);
    if (cached?.key === key) return cached.parsed;
    let text = null;
    if (stat) { try { text = stat.size > 1 << 20 ? "{}" : fs.readFileSync(file, "utf8"); } catch { text = null; } }
    const parsed = { ...launch.parseLaunchConfig(text, cwd), file };
    launchCache.set(cwd, { key, parsed });
    return parsed;
  }
  const serverKey = (cwd, name) => `${cwd}\u0000${name.toLowerCase()}`;

  // ------------------------------------------------------------------ the last frame across a restart
  // cf580efe9 Pi / ri (readable 2521-2547, 3812-3857): after a relaunch the pane shows a dimmed screenshot of the page
  // the session's preview had before the app closed, with its dev server's name, Restart and Show start page. A frame
  // is kept per session for a page of one of the folder's launch.json servers: taken while a pane still shows the page
  // (it leaves the pane, its window closes) and again at quit, written at quit, offered on the next run only, and
  // discarded once the session shows a page again or the user dismisses it.
  const runStartedAt = Date.now();
  const FRAME_LIMIT = 50;
  const FRAME_TIMEOUT_MS = 800;
  const recentFrames = new Map(); // session id → { configName, url, data } taken this run
  const restoredFrames = new Map(); // session id → { configName, savedAt } from before this run, or null
  const frameBase = (sessionId) => path.join(frameDir, crypto.createHash("sha256").update(String(sessionId)).digest("hex").slice(0, 32));
  function restoredFrame(sessionId) {
    if (!frameDir || typeof sessionId !== "string" || !sessionId) return null;
    if (!restoredFrames.has(sessionId)) {
      let meta = null;
      try {
        const saved = JSON.parse(fs.readFileSync(`${frameBase(sessionId)}.json`, "utf8"));
        if (saved?.sessionId === sessionId && typeof saved.configName === "string" && saved.configName && Number(saved.savedAt) < runStartedAt && fs.statSync(`${frameBase(sessionId)}.jpg`).isFile())
          meta = { configName: saved.configName, savedAt: Number(saved.savedAt) };
      } catch { meta = null; }
      restoredFrames.set(sessionId, meta);
    }
    return restoredFrames.get(sessionId);
  }
  function readFrame(sessionId) {
    const meta = restoredFrame(sessionId);
    if (!meta) return null;
    try { return { jpegBase64: fs.readFileSync(`${frameBase(sessionId)}.jpg`).toString("base64"), configName: meta.configName, savedAt: meta.savedAt }; } catch { return null; }
  }
  function discardFrame(sessionId) {
    if (!frameDir || !restoredFrame(sessionId)) return false;
    restoredFrames.set(sessionId, null);
    for (const ext of [".json", ".jpg"]) { try { fs.rmSync(`${frameBase(sessionId)}${ext}`, { force: true }); } catch { /* gone */ } }
    const entry = previews.get(sessionId);
    if (entry) notify(entry);
    return true;
  }
  // The launch.json server a page belongs to: same port on a loopback host, a server of the folder or a configuration.
  function frameConfig(entry) {
    let url;
    try { url = new URL((alive(entry) ? entry.view.webContents.getURL() : "") || entry.url); } catch { return null; }
    if (!/^https?:$/.test(url.protocol) || !launch.isLocalHost(url.hostname)) return null;
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    const server = [...servers.values()].find((other) => other.cwd === entry.cwd && !other.attach && Number(other.port) === port);
    if (server) return server.name;
    return launchInfo(entry.cwd).configs.find((config) => !config.attach && Number(config.port) === port)?.name ?? null;
  }
  async function captureFrame(entry) {
    if (!frameDir || !alive(entry) || entry.crashed) return null;
    const configName = frameConfig(entry);
    if (!configName) return null;
    const url = entry.view.webContents.getURL();
    try {
      const shot = await Promise.race([cdp(entry, "Page.captureScreenshot", { format: "jpeg", quality: 60 }), sleep(FRAME_TIMEOUT_MS).then(() => null)]);
      return shot?.data ? { configName, url, data: shot.data } : null;
    } catch { return null; }
  }
  // A page about to leave the pane that shows it: its frame is kept in memory for the quit.
  function rememberFrame(entry) {
    if (!frameDir || !holder(entry)) return;
    const sessionId = entry.id, recent = recentFrames.get(sessionId);
    if (recent && recent.url === entry.url && Date.now() - recent.at < 5000) return;
    captureFrame(entry).then((frame) => { if (frame && previews.get(sessionId) === entry) recentFrames.set(sessionId, { ...frame, at: Date.now() }); }, () => {});
  }
  function writeFrame(sessionId, frame) {
    fs.mkdirSync(frameDir, { recursive: true });
    fs.writeFileSync(`${frameBase(sessionId)}.jpg`, Buffer.from(frame.data, "base64"));
    fs.writeFileSync(`${frameBase(sessionId)}.json`, JSON.stringify({ sessionId, configName: frame.configName, url: frame.url, savedAt: Date.now() }));
  }
  function pruneFrames() {
    let files;
    try { files = fs.readdirSync(frameDir).filter((name) => name.endsWith(".json")).map((name) => ({ name, at: fs.statSync(path.join(frameDir, name)).mtimeMs })); } catch { return; }
    for (const { name } of files.sort((a, b) => b.at - a.at).slice(FRAME_LIMIT)) {
      for (const file of [name, name.replace(/\.json$/, ".jpg")]) { try { fs.rmSync(path.join(frameDir, file), { force: true }); } catch { /* gone */ } }
    }
  }
  /** At quit: each session's dev-server page (a live capture, else the one taken when it left its pane) goes to disk. */
  async function saveFrames() {
    if (!frameDir) return;
    const sessions = [...previews.values()];
    await Promise.all(sessions.map(async (entry) => {
      const configName = alive(entry) ? frameConfig(entry) : null;
      const recent = recentFrames.get(entry.id);
      const url = alive(entry) ? entry.view.webContents.getURL() : null;
      const frame = (configName ? await captureFrame(entry) : null) ?? (configName && recent?.configName === configName && recent.url === url ? recent : null);
      if (!frame) return;
      try { writeFrame(entry.id, frame); } catch (error) { logger.warn?.(`preview: couldn’t keep the last frame of ${entry.id}: ${error.message}`); }
    }));
    pruneFrames();
  }
  function serverView(server) {
    return { name: server.name, port: server.port, url: server.url, status: server.status, error: server.error, attach: server.attach === true, startedAt: server.startedAt };
  }
  function snapshot(entry) {
    entry = previews.get(entry.id) ?? entry;
    const info = launchInfo(entry.cwd);
    const folderServers = [...servers.values()].filter((server) => server.cwd === entry.cwd);
    const configs = info.configs.map((config) => ({ name: config.name, port: config.port, url: launch.configUrl(config), attach: config.attach }));
    const contents = alive(entry) ? entry.view.webContents : null;
    return {
      sessionId: entry.id,
      activeTabId: entry.tabId,
      canReopenTab: !!closedTabs.get(entry.id)?.urls.length && [...entry.group.tabs.values()].filter(tab => !tab.placeholder).length < 9,
      lastTabClosed: entry.group.lastTabClosed === true,
      tabs: [...entry.group.tabs.values()].filter(tab => !tab.placeholder).map(tab => ({ id: tab.tabId, url: tab.url, title: tab.title, loading: tab.loading, faviconUrl: tab.faviconUrl })),
      cwd: entry.cwd,
      url: entry.url,
      title: entry.title,
      loading: entry.loading,
      selection: entry.selection ?? { enabled: false, busy: false },
      error: entry.error,
      // A reaped page still counts: showing the pane reopens it.
      hasPage: (!!contents || entry.reclaimed) && !!entry.url && entry.url !== "about:blank",
      canGoBack: !!contents && contents.navigationHistory.canGoBack(),
      canGoForward: !!contents && contents.navigationHistory.canGoForward(),
      devtools: !!contents && contents.isDevToolsOpened(),
      viewport: { ...entry.viewport },
      // The pane that shows the page now, or null when nobody does (any pane that shows it takes it).
      hostId: holder(entry)?.instanceId ?? null,
      launch: { exists: info.exists, error: info.exists ? info.error : null, problems: info.problems, configs, autoVerify: info.autoVerify },
      keepCookies: keeping(),
      previewStorage: isCoworkSession(entry.id) ? "shared" : storageMode(),
      servers: folderServers.map(serverView),
      // cf580efe9 Pi: the page this session showed before the app closed (its frame is read with preview-last-frame).
      lastFrame: restoredFrame(entry.id),
      consoleErrors: entry.console.filter((line) => line.level === "error").length,
      // The page's latest download (the saved file's path stays here: "preview-download-reveal" shows it in Finder).
      recentFiles: entry.recentFiles.map((file) => ({ path: file, name: path.relative(entry.cwd, file) || path.basename(file), url: require("node:url").pathToFileURL(file).href })),
      download: entry.download ? { file: entry.download.file, state: entry.download.state, reason: entry.download.reason ?? null, at: entry.download.at, canReveal: !!entry.download.path } : null,
      placeholder: nativeTheme.shouldUseDarkColors ? PLACEHOLDER.dark : PLACEHOLDER.light,
    };
  }
  function notify(entry, now = false) {
    entry = previews.get(entry.id) ?? entry;
    clearTimeout(entry.notifyTimer);
    const send = () => {
      entry.notifyTimer = null;
      const state = snapshot(entry);
      for (const sender of [...entry.subscribers]) {
        if (sender.isDestroyed()) { entry.subscribers.delete(sender); continue; }
        sender.send("desktop:event", { kind: "preview", sessionId: entry.id, state });
      }
    };
    if (now) send(); else entry.notifyTimer = setTimeout(send, 40);
  }
  function notifyFolder(cwd) {
    for (const entry of previews.values()) if (entry.cwd === cwd) notify(entry);
  }
  // The project files dev-server detection reads (preview-launch.mjs detectServerCandidates): regular files of at most
  // 1 MiB inside the session folder, links leading out of it refused.
  function projectFiles(root) {
    const inside = (name) => { const file = path.resolve(root, name); return launch.insideFolderReal(root, file) ? file : null; };
    return {
      read: (name) => { const file = inside(name); if (!file) return null; try { const stat = fs.statSync(file); return stat.isFile() && stat.size <= 1 << 20 ? fs.readFileSync(file, "utf8") : null; } catch { return null; } },
      exists: (name) => { const file = inside(name); try { return !!file && fs.statSync(file).isFile(); } catch { return false; } },
    };
  }
  // .claude/launch.json edited by hand (or by the agent) reaches an open pane at once: the folder and its .claude
  // folder are watched (a new .claude folder too) while the pane shows that folder, debounced, for the life of the app.
  const launchWatchers = new Map(); // cwd → { folder, claude, timer }
  function watchLaunch(cwd) {
    if (typeof cwd !== "string" || !cwd || launchWatchers.size >= 64) return;
    let record = launchWatchers.get(cwd);
    if (!record) { record = { folder: null, claude: null, timer: null }; launchWatchers.set(cwd, record); }
    const changed = () => {
      clearTimeout(record.timer);
      record.timer = setTimeout(() => { record.timer = null; watchClaude(); notifyFolder(cwd); }, 150);
      record.timer.unref?.();
    };
    const watch = (dir, filter) => {
      try {
        const watcher = fs.watch(dir, { persistent: false }, (_event, name) => { if (!name || filter(String(name))) changed(); });
        watcher.on("error", () => { try { watcher.close(); } catch { /* closed */ } if (record.claude === watcher) record.claude = null; if (record.folder === watcher) record.folder = null; });
        return watcher;
      } catch { return null; }
    };
    const watchClaude = () => { if (!record.claude) record.claude = watch(path.join(cwd, path.dirname(launch.LAUNCH_FILE)), (name) => name === path.basename(launch.LAUNCH_FILE)); };
    if (!record.folder) record.folder = watch(cwd, (name) => name === path.dirname(launch.LAUNCH_FILE));
    watchClaude();
  }

  // ------------------------------------------------------------------ pane requests
  function subscribe(entry, sender) {
    watchLaunch(entry.cwd);
    if (entry.subscribers.has(sender)) return;
    entry.subscribers.add(sender);
    if (!subscriberCleanup.has(sender)) {
      const cleanup = () => {
        subscriberCleanup.delete(sender);
        for (const active of previews.values()) {
          active.subscribers.delete(sender);
          for (const tab of active.group.tabs.values()) if (tab.host?.sender === sender) { tab.host = null; place(tab); }
        }
      };
      subscriberCleanup.set(sender, cleanup);sender.once("destroyed", cleanup);
    }
  }
  function state(sender, sessionId) {
    const entry = preview(sessionId);
    subscribe(entry, sender);
    return snapshot(entry);
  }
  /** The pane's viewport (CSS px in the sender window), whether it shows, and which pane instance asks. */
  function attach(sender, { sessionId, instanceId, bounds, visible = true } = {}) {
    const entry = preview(sessionId);
    subscribe(entry, sender);
    if (typeof instanceId !== "string" || !instanceId) throw new Error("Unknown preview pane.");
    const window = windowOf(sender);
    if (!window || window.isDestroyed?.()) throw new Error("Unknown window.");
    const owner = entry.host;
    const valid = bounds && [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) && bounds.width > 0 && bounds.height > 0;
    const shows = visible !== false && !!valid;
    // 2.2553.1 showPreview / hidePreview: while another pane shows the page, this pane's show is refused and its
    // hide ignored (the snapshot's hostId says who has it); once that pane stops showing it, a pane that shows it takes it.
    const other = owner && owner.instanceId !== instanceId && owner.sender && !owner.sender.isDestroyed() && owner.window && !owner.window.isDestroyed();
    if (other && (holder(entry) || !shows)) return snapshot(entry);
    const zoom = sender.getZoomFactor?.() || 1;
    entry.paneBounds = valid ? { x: Math.round(bounds.x * zoom), y: Math.round(bounds.y * zoom), width: Math.max(1, Math.round(bounds.width * zoom)), height: Math.max(1, Math.round(bounds.height * zoom)) } : entry.paneBounds;
    const changedHost = owner?.instanceId !== instanceId;
    if (changedHost) stopSelection(entry);
    const wasShown = !!holder(entry);
    entry.visible = shows;
    entry.host = { sender, window, instanceId };
    if (changedHost) entry.occluded = false; // the cover was over the other pane
    if (changedHost && !window.__codeDesktopPreviewWatch) {
      window.__codeDesktopPreviewWatch = true;
      // Before the window's views go with it: the page moves to the parking window (windowClosed is the registry's
      // after-the-fact notice for the same thing).
      window.once("close", () => windowClosed(window));
    }
    if (alive(entry)) { place(entry); if (changedHost) applyEmulation(entry).catch(() => {}); }
    else if (shows) revive(entry).catch(() => {});
    if (changedHost || wasShown !== !!holder(entry)) notify(entry);
    return snapshot(entry);
  }
  /** A window that closes (or closed) hands every page it showed to the parking window; the pages keep running. */
  function windowClosed(window) {
    for (const item of allPreviews()) {
      if (item.host?.window !== window && item.parent !== window) continue;
      if (item.host?.window === window) { rememberFrame(item); item.host = null; }
      if (item.parent === window) item.parent = null;
      place(item);
      notify(item);
    }
  }
  function detach(sender, { sessionId, instanceId } = {}) {
    const entry = previews.get(sessionId);
    if (!entry) return false;
    if (entry.host?.instanceId === instanceId && entry.host.sender === sender) {
      rememberFrame(entry);
      entry.host = null;
      place(entry);
      notify(entry);
    }
    return true;
  }
  async function occlude(sender, { sessionId, instanceId, occluded }) {
    const entry = previews.get(sessionId);
    if (!entry || entry.host?.instanceId !== instanceId) return { image: null };
    let image = null;
    if (occluded && !entry.occluded && alive(entry) && entry.visible) {
      try {
        const shot = await Promise.race([cdp(entry, "Page.captureScreenshot", { format: "jpeg", quality: 70 }), sleep(300).then(() => null)]);
        if (shot?.data) image = `data:image/jpeg;base64,${shot.data}`;
      } catch { image = null; }
    }
    const wasShown = !!holder(entry);
    entry.occluded = occluded === true;
    place(entry);
    if (wasShown !== !!holder(entry)) notify(entry);
    return { image };
  }
  function focusPage(sender, { sessionId }) {
    const entry = previews.get(sessionId);
    if (!alive(entry) || entry.host?.sender !== sender) return false;
    entry.view.webContents.focus();
    return true;
  }

  // Navigation: `agent` asks before an outside site (once per site and session).
  async function navigate(sessionId, value, { agent = null, tabId = null } = {}) {
    const active = preview(sessionId), entry = tabId ? active.group.tabs.get(tabId) : active;
    if (!entry) throw new Error("Unknown preview tab.");
    const allowed = launch.navigationAllowed(value, entry.cwd);
    if (!allowed.ok) throw new Error(allowed.reason);
    if (agent) await agent.ensureSite(allowed.url);
    if (previews.get(sessionId)?.group.tabs.get(entry.tabId) !== entry) throw new Error("The preview tab was closed.");
    entry.placeholder = false;
    entry.group.lastTabClosed = false;
    ensureView(entry);
    entry.error = null;
    const contents = entry.view.webContents;
    const done = new Promise((resolve) => {
      let settled = false;
      const finish = (result) => { if (settled) return; settled = true; clearTimeout(timer); contents.off("did-finish-load", ok); contents.off("did-fail-load", failed); contents.off("destroyed", closed); entry.blockWaiters.delete(blocked); resolve(result); };
      const ok = () => finish({ ok: true });
      const closed = () => finish({ ok: false, code: "closed", description: "The preview tab was closed." });
      // A redirect to an outside site the user declined (holdOutside): the load ends there.
      const blocked = (host) => finish({ ok: false, code: "blocked", description: declinedText(host) });
      entry.blockWaiters.add(blocked);
      const failed = (_event, code, description, _url, isMainFrame) => { if (isMainFrame && code !== -3) finish({ ok: false, code, description }); };
      const timer = setTimeout(() => finish({ ok: true, slow: true }), 30000);
      contents.on("did-finish-load", ok);
      contents.on("did-fail-load", failed);
      contents.on("destroyed", closed);
    });
    contents.loadURL(allowed.url).catch(() => {});
    rememberFile(entry, allowed.url);
    const result = await done;
    // cf580efe9 fa He: once the session shows a page again, the frame from before the restart is discarded.
    if (result.ok) discardFrame(entry.id);
    if (previews.get(entry.id)?.group.tabs.get(entry.tabId) === entry) { armReap(entry, true); notify(entry); }
    return { ...result, url: contents.isDestroyed() ? entry.url : contents.getURL(), title: contents.isDestroyed() ? entry.title : contents.getTitle() };
  }
  // An HTML file of the session folder the preview opened (file://), for Servers & settings › Files.
  function rememberFile(entry, url) {
    let file;
    try { file = require("node:url").fileURLToPath(url); } catch { return; }
    if (!/\.html?$/i.test(file) || !launch.insideFolder(entry.cwd, file)) return;
    entry.recentFiles = [file, ...entry.recentFiles.filter((other) => other !== file)].slice(0, 8);
  }
  async function openFile(sender, sessionId, file) {
    const entry = preview(sessionId);
    if (typeof file !== "string" || !path.isAbsolute(file) || !/\.html?$/i.test(file)) throw new Error("Choose an HTML file.");
    if (!launch.insideFolderReal(entry.cwd, file)) throw new Error("Choose an HTML file in this session’s folder.");
    subscribe(entry, sender);
    entry.agentDriven = false;
    return navigate(sessionId, require("node:url").pathToFileURL(file).href);
  }
  function userNavigate(sessionId, text) {
    const entry = preview(sessionId);
    const url = launch.parseUserUrl(text, entry.cwd, home);
    if (!url) throw new Error("Enter a URL.");
    entry.agentDriven = false;
    return navigate(sessionId, url);
  }
  function openTranscriptLink(sessionId, url) {
    const active = preview(sessionId);
    const origin = typeof url === 'string' ? previewLinkOrigin(url) : null;
    if (!origin || externalOnlyLink(url) || !launch.navigationAllowed(url, active.cwd).ok) return { opened: false };
    // Native xQ reuses a non-popup tab by its normalized origin. A new site
    // preserves the current page; a full strip falls back to the system browser.
    let next = [...active.group.tabs.values()].find(tab => !tab.popup && previewLinkOrigin(tab.url) === origin);
    if (!next) {
      if (!active.placeholder && active.group.tabs.size > 8) return { opened: false };
      const state = newTab(sessionId); next = tabEntry(sessionId, state.activeTabId);
    } else activateTab(sessionId, next.tabId);
    // A user gesture does not grant the agent site access. Later tool use still
    // passes through ensureSite and the existing site approval path.
    next.agentDriven = false;
    const tabId = next.tabId;
    void navigate(sessionId, url, { tabId }).catch(error => {
      if (previews.get(sessionId)?.group.tabs.get(tabId) === next) {
        next.error = { code: 'navigation', description: error.message, url }; notify(next);
      }
    });
    return { opened: true, tabId };
  }
  function addressNavigate(sessionId, text) {
    const entry = preview(sessionId);
    const target = previewAddressTarget(text, entry.url, { cwd: entry.cwd, home });
    // The source address caller consumes invalid input without sending it to a
    // website or creating another page. Existing native navigation validates
    // credentials and resolved file boundaries for every accepted destination.
    if (!target) return { ok: false, invalid: true };
    entry.agentDriven = false;
    if (target.kind === 'reload') return { ok: history(sessionId, 'reload'), url: target.url, reloaded: true };
    return navigate(sessionId, target.url);
  }
  function history(sessionId, action) {
    const entry = previews.get(sessionId);
    if (!alive(entry)) return false;
    const contents = entry.view.webContents;
    if (action === "back" && contents.navigationHistory.canGoBack()) contents.navigationHistory.goBack();
    else if (action === "forward" && contents.navigationHistory.canGoForward()) contents.navigationHistory.goForward();
    else if (action === "reload") { if (entry.crashed) { entry.crashed = false; contents.loadURL(entry.url || "about:blank").catch(() => {}); } else contents.reload(); }
    else if (action === "stop") contents.stop();
    return true;
  }
  function emulate(sessionId, { preset, width, height, colorScheme, agent = false } = {}) {
    const entry = preview(sessionId);
    const next = { ...entry.viewport };
    if (preset !== undefined) {
      if (preset === "desktop" || preset === "responsive") Object.assign(next, { preset: "responsive", width: null, height: null });
      else if (PRESETS[preset]) Object.assign(next, { preset, ...PRESETS[preset] });
      else if (preset === "custom") {
        const w = Math.round(Number(width)), h = Math.round(Number(height));
        if (!(w >= 200 && w <= 4000 && h >= 200 && h <= 4000)) throw new Error("A custom viewport is 200–4000 pixels wide and tall.");
        Object.assign(next, { preset: "custom", width: w, height: h });
      } else throw new Error("Unknown viewport preset.");
    }
    if (colorScheme !== undefined) {
      if (!COLOR_SCHEMES.has(colorScheme)) throw new Error("Unknown color scheme.");
      next.colorScheme = colorScheme;
    }
    next.setByAgent = agent === true;
    entry.viewport = next;
    place(entry);
    entry.emulating = applyEmulation(entry).catch(() => {});
    notify(entry);
    return { ...next };
  }
  async function capture(sessionId, { format = "png", quality = 80 } = {}) {
    const entry = previews.get(sessionId);
    if (entry) await revive(entry);
    if (!alive(entry) || !entry.url || entry.url === "about:blank") throw new Error("Nothing is open in the preview.");
    const shot = await cdp(entry, "Page.captureScreenshot", format === "jpeg" ? { format: "jpeg", quality } : { format: "png" });
    return Buffer.from(shot.data, "base64");
  }
  function openDevTools(sessionId) {
    const entry = previews.get(sessionId);
    if (!alive(entry)) throw new Error("Nothing is open in the preview.");
    const contents = entry.view.webContents;
    if (contents.isDevToolsOpened()) contents.closeDevTools(); else contents.openDevTools({ mode: "detach", activate: true });
    return true;
  }
  function openExternal(sessionId) {
    const entry = previews.get(sessionId);
    const url = alive(entry) ? entry.view.webContents.getURL() : entry?.url;
    if (!url || !/^https?:\/\//i.test(url)) throw new Error("This only works for websites.");
    return shell.openExternal(url).then(() => true);
  }

  // ------------------------------------------------------------------ dev servers
  async function startServer(sessionId, name, { open = true, agent = null } = {}) {
    const entry = preview(sessionId);
    const info = launchInfo(entry.cwd);
    if (!info.exists) throw Object.assign(new Error(`No .claude/launch.json in ${entry.cwd}.`), { code: "no-config" });
    const config = info.configs.find((candidate) => candidate.name.toLowerCase() === String(name || "").toLowerCase()) ?? (!name && info.configs.length === 1 ? info.configs[0] : null);
    if (!config) throw Object.assign(new Error(info.configs.length ? `No server named “${name}” in .claude/launch.json. Available: ${info.configs.map((c) => c.name).join(", ")}.` : info.error || "launch.json has no usable configurations."), { code: "no-server" });
    const key = serverKey(entry.cwd, config.name);
    let server = servers.get(key);
    let reused = false;
    if (server && (server.status === "running" || server.status === "starting")) reused = true;
    else {
      // 2.42304.0 E3i / startFromConfig: whether the port may move is settled before anything is asked or stopped
      // (GrowthBook 2711562102, "autoPort", and a start script that pins the port).
      const plan = config.attach ? null : await portPlan(entry.cwd, config);
      // The agent starting a command (not the user's own Start): the user approves that exact configuration first.
      if (agent && !config.attach) await agent.approveServer(config, { portMayReassign: plan.portMayReassign });
      server = servers.get(key);
      if (server && (server.status === "running" || server.status === "starting")) reused = true;
      else {
        // startFromConfig (the user's own Run, q4i): a port that can't move is first freed of this folder's other server.
        if (!agent && plan && !plan.reassignable) await stopConflicting(entry.cwd, config);
        server = await spawnServer(entry.cwd, config, key, plan);
      }
    }
    entry.lastServer = config.name;
    notifyFolder(entry.cwd);
    const ready = await server.ready;
    notifyFolder(entry.cwd);
    if (!ready.ok) throw Object.assign(new Error(ready.message), { code: ready.code, logs: server.logs.slice(-40).map(stripAnsi), ...(ready.heldPort ? { heldPort: ready.heldPort } : {}) });
    let page = null;
    if (open) page = await navigate(sessionId, server.url, { agent });
    // movedFrom: D3i's `configuredPort` (the scan moved the server off its configured port, rather than autoPort's
    // OS-assigned fallback), which the original's preview_start result words differently.
    return { server: serverView(server), reused, page, assignedPort: server.assignedPort ?? null, configuredPort: config.port, ...(server.movedFrom !== undefined ? { movedFrom: server.movedFrom } : {}) };
  }
  // The port plan of one configuration (2.42304.0 E3i: o0i, a0i). `reassignable` is startFromConfig's `l`: the port may
  // move (autoPort true, or not false with the gate on and no script pinning it).
  async function portPlan(cwd, config) {
    const gate = (await autoPortGate()) !== false;
    const policyEntry = previewHost.portEntry(config);
    const { portRetargetable, scriptPinnedPorts } = await ports.portRetargetability(policyEntry, cwd, gate);
    return {
      gate, portRetargetable, scriptPinnedPorts,
      portMayReassign: await ports.portMayReassign(policyEntry, gate, portRetargetable),
      reassignable: config.autoPort !== false && (config.autoPort === true || (gate && portRetargetable)),
    };
  }
  // startFromConfig's q4i: the live servers of this folder (the local "session") on the configuration's port under
  // another name, stopped and waited for (a2.stopAndWait).
  async function stopConflicting(cwd, config) {
    for (const row of ports.conflictingServers(registryView(), previewHost.portEntry(config), cwd, cwd)) await haltServer(row.local);
  }
  // a2.collectSiblingRoots: the other live servers' process roots, this folder's as "same-session".
  const siblingRoots = (own) => [...servers.values()].filter((other) => other !== own && (other.status === "running" || other.status === "starting") && other.child?.pid !== undefined)
    .map((other) => ({ rootPid: other.child.pid, session: other.cwd !== own.cwd ? "cross-session" : "same-session" }));
  async function spawnServer(cwd, config, key, plan = null) {
    const server = { key, cwd, name: config.name, config, child: null, status: "starting", port: config.port, url: launch.configUrl(config), logs: [], error: null, attach: config.attach, startedAt: Date.now(), exitCode: null, ready: null, allocating: !config.attach };
    servers.set(key, server);
    const log = (text) => { for (const line of String(text).split(/\r?\n/)) if (line.length) push(server.logs, line.slice(0, 4000), LOG_LIMIT); };
    const fail = (code, message, extra = {}) => { server.allocating = false; server.status = "failed"; server.error = { code, message, ...extra }; notifyFolder(cwd); return { ok: false, code, message, ...extra }; };
    const halted = () => server.status === "stopping" || server.status === "stopped";
    const stopped = { ok: false, code: "stopped", message: "The server was stopped." };
    server.ready = (async () => {
      if (config.attach) {
        server.status = "running";
        return { ok: true };
      }
      // The folder launch.json named was inside the project when it was read (and approved); a link swapped in since
      // doesn't move the command outside it.
      if (!launch.insideFolderReal(cwd, config.cwd)) return fail("cwd", `The "cwd" of “${config.name}” in .claude/launch.json is outside the project folder (it may be a link to another folder). Nothing was run.`);
      // preview-01 / preview-14 (2.42304.0 D3i → I2i): the configured port, else (when it may move) the next free one
      // up to 20 above it — skipping live servers' ports, the ones other starts hold (pending / exact-bind reservations)
      // and the ones this folder's other launch.json entries pin — else an OS-assigned one; or the original's error.
      const policy = plan ?? await portPlan(cwd, config);
      let pinned;
      if (policy.gate && config.autoPort !== false && (config.autoPort === true || policy.portRetargetable)) {
        try { pinned = await ports.pinnedPortsOf(launchInfo(cwd).configs.filter((other) => other.name !== config.name).map(previewHost.portEntry), cwd); } catch { pinned = undefined; }
        if (policy.scriptPinnedPorts?.size) pinned = new Set([...(pinned ?? []), ...policy.scriptPinnedPorts]);
      }
      let allocation;
      try { allocation = await ports.resolvePort(config.port, config.autoPort, cwd, policy.gate, pinned, policy.portRetargetable); }
      catch (error) {
        if (!(error instanceof ports.PortInUseError)) return fail("port", `Couldn’t pick a port for “${config.name}”: ${error?.message ?? error}`);
        // Another folder's server (another chat's, which preview_stop can't reach) holds it: the card names the port (ca80fca8d xq).
        const held = registryView(server).some((row) => row.port === config.port && (row.status === "running" || row.status === "starting") && row.cwd !== cwd);
        return held ? fail("port-held", error.message, { heldPort: config.port }) : fail("port-in-use", error.message);
      }
      const port = allocation.port;
      // a2.start: the server holds its port in the registry from here, so the reservation that kept it is released (M2i).
      server.port = port;
      server.allocating = false;
      ports.releasePort(port);
      if (halted()) return stopped;
      if (port !== config.port) { server.assignedPort = port; server.url = launch.configUrl(config, port); }
      if (allocation.movedFrom !== undefined) server.movedFrom = allocation.movedFrom;
      // D3i: a moved server's own --port / -p / --port= argument follows it (k1i).
      const args = port !== config.port ? ports.rewritePortArgs(config.args, port, { joinedShortForm: policy.gate, command: config.command }) : config.args;
      let env;
      try { env = await spawnEnv(); } catch { env = { ...process.env }; }
      if (halted()) return stopped;
      let child;
      try {
        child = spawnProcess(config.command, args, { cwd: config.cwd, env: { ...env, FORCE_COLOR: "1", ...config.env, PORT: String(port) }, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
      } catch (error) {
        return fail("spawn", `Couldn’t start \`${config.command}\`: ${error.message}`);
      }
      server.child = child;
      log(`$ ${[config.command, ...args].join(" ")}`);
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", log);
      child.stderr.on("data", log);
      let exited = null;
      const exit = new Promise((resolve) => {
        child.once("error", (error) => { exited = { error }; resolve(exited); });
        child.once("exit", (code, signal) => { exited = { code, signal }; resolve(exited); });
      });
      exit.then(() => {
        server.child = null;
        server.exitCode = exited?.code ?? null;
        if (server.status === "running" || server.status === "stopping") {
          if (server.status === "running") log(`[process exited${exited?.code != null ? ` with code ${exited.code}` : ""}]`);
          server.status = "stopped";
        }
        notifyFolder(cwd);
      });
      const describeExit = () => exited?.error?.code === "ENOENT"
        ? fail("not-found", `Command not found: \`${config.command}\`. Check the "runtimeExecutable" field in .claude/launch.json and make sure it's installed and on PATH.`)
        : exited?.error ? fail("spawn", `Couldn’t start \`${config.command}\` (${exited.error.code || exited.error.message}).`)
          : fail("exited", `The dev server exited during startup (code ${exited?.code ?? exited?.signal}). Fix the error in the output, then start it again.`);
      // preview-03 (2.42304.0 a2.start readiness → O0i): who answers the port. Run only with the gate on, as there.
      const identity = async (answering) => {
        if (!policy.gate || !child.pid) return { outcome: "running" };
        try { return await ports.verifyServerIdentity(answering, port, child.pid, ports.portOccupancy(registryView(server), undefined, port, cwd), siblingRoots(server)); }
        catch { return { outcome: "running" }; }
      };
      const deadline = Date.now() + READY_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (exited) return describeExit();
        if (halted()) return stopped;
        if (await portOpen(port)) {
          const verdict = await identity(true);
          if (exited) return describeExit();
          if (halted()) return stopped;
          // Another process answers this server's port: its guidance goes to the log, and (unlike the original, which
          // leaves the process up in "error") the process is stopped, as a failed start here is.
          // R4e-preview: the original's log line first (a2.start: N.warn(…, {serverId, port})); the card names the port.
          if (verdict.outcome === "mismatch") {
            logger.warn?.("[Preview] Server identity check failed %o", { serverId: server.name, port });
            log(verdict.guidance); stopProcess(server); return fail("identity", verdict.guidance, { port });
          }
          if (verdict.advisory !== undefined) log(verdict.advisory);
          server.status = "running";
          notifyFolder(cwd);
          return { ok: true };
        }
        await Promise.race([sleep(250), exit]);
      }
      // The original keeps a server that never answered as running with this advisory; here it is the timeout's detail.
      const { advisory } = await identity(false);
      if (advisory !== undefined) log(advisory);
      stopProcess(server);
      return fail("timeout", `The dev server didn’t answer on port ${port} within ${READY_TIMEOUT_MS / 1000} seconds.${advisory !== undefined ? `\n\n${advisory}` : ""}`);
    })();
    // A start that fails before the process runs leaves no zombie entry behind in "starting".
    server.ready.then((result) => { if (!result.ok && server.status === "starting") server.status = "failed"; });
    return server;
  }
  // A dev server runs in its own process group (spawnServer detached): a signal goes to the whole group, so the
  // programs npm or a shell started for it get it too.
  function signalGroup(child, name) {
    if (!child?.pid) return;
    try { if (process.platform !== "win32") process.kill(-child.pid, name); else child.kill(name); } catch { try { child.kill(name); } catch { /* gone */ } }
  }
  function stopProcess(server) {
    const child = server.child;
    if (!child?.pid) return;
    const signal = (name) => signalGroup(child, name);
    signal("SIGTERM");
    const timer = setTimeout(() => signal("SIGKILL"), 3000);
    timer.unref?.();
    child.once("exit", () => clearTimeout(timer));
  }
  async function stopServer(sessionId, name) {
    const entry = preview(sessionId);
    const server = servers.get(serverKey(entry.cwd, String(name || entry.lastServer || "")));
    if (!server) throw new Error(`No server named “${name}” is running.`);
    if (server.attach) { servers.delete(server.key); notifyFolder(entry.cwd); return { stopped: true, attach: true }; }
    await haltServer(server);
    return { stopped: true };
  }
  // Stop a server and wait (at most four seconds) for its process to exit (a2.stopAndWait).
  async function haltServer(server) {
    if (server.child) {
      server.status = "stopping";
      const exited = new Promise((resolve) => server.child.once("exit", resolve));
      stopProcess(server);
      await Promise.race([exited, sleep(4000)]);
    }
    server.status = "stopped";
    notifyFolder(server.cwd);
  }
  function serverLogs(sessionId, name, { lines = 200, ansi = true } = {}) {
    const entry = preview(sessionId);
    const server = servers.get(serverKey(entry.cwd, String(name || entry.lastServer || "")));
    if (!server) return { name, lines: [], status: null };
    const out = server.logs.slice(-Math.max(1, Math.min(LOG_LIMIT, lines)));
    return { name: server.name, status: server.status, lines: ansi ? out : out.map(stripAnsi), error: server.error };
  }
  function clearLogs(sessionId, name) {
    const entry = preview(sessionId);
    const server = servers.get(serverKey(entry.cwd, String(name || "")));
    if (server) server.logs.length = 0;
    return true;
  }

  // ------------------------------------------------------------------ the agent's view of one session
  function forSession(session, { requestApproval = async () => false, signal = null } = {}) {
    const sessionId = session.id;
    const entry = () => preview(sessionId);
    const stopped = () => signal?.aborted ? new Error("The turn was stopped. Nothing was run.") : null;
    // A question this call asks closes when the call is cancelled (the turn was stopped).
    const ask = (request) => requestApproval(request, signal ? { signal } : {});
    // The agent uses the page from now on: its own outside navigations ask with this session's approval (no call's
    // signal: the page, not a call, starts them).
    const drive = (item = entry()) => { item.agentDriven = true; item.siteApproval = (request) => requestApproval(request, {}); return item; };
    const ensureSite = async (url) => {
      let parsed;
      try { parsed = new URL(url); } catch { return; }
      if (!/^https?:$/.test(parsed.protocol) || launch.isLocalHost(parsed.hostname)) return;
      const item = entry();
      if (siteAllowed(item, parsed.host, parsed.href)) return;
      // Asked once: a host the user declined in this session is refused without asking again.
      if (item.declinedHosts.has(parsed.host)) throw new Error(declinedText(parsed.host));
      const ok = await ask({ kind: "preview-site", host: parsed.host, url: parsed.href });
      if (stopped()) throw stopped();
      if (!ok) { item.declinedHosts.add(parsed.host); throw new Error(declinedText(parsed.host)); }
      item.approvedHosts.add(parsed.host);
      item.declinedHosts.delete(parsed.host);
    };
    // A launch.json command runs outside the core's sandbox, as the user: the agent starts one only after the user
    // approved that exact configuration in this session (an edited launch.json asks again).
    const approveServer = async (config, { portMayReassign = false } = {}) => {
      const item = entry();
      const fingerprint = crypto.createHash("sha256").update(JSON.stringify([config.command, config.args, config.cwd, config.env ?? {}, config.port ?? null, config.autoPort ?? null])).digest("hex");
      if (item.approvedServers.has(fingerprint)) return;
      if (stopped()) throw stopped();
      // The card's "Runs in {cwd} on port {port}" (c96d752d0 Kk / wA): the original's ask carries zIn's `port` (the
      // configured one) and HIn adds portMayReassign when a0i says the port may move (startServer's port plan), which
      // the card words as "(or the next free port)".
      const ok = await ask({ kind: "preview-server", name: config.name, command: config.command, args: config.args, cwd: config.cwd, env: config.env ?? {}, port: config.port ?? null, portMayReassign: portMayReassign === true });
      if (stopped()) throw stopped();
      if (!ok) throw Object.assign(new Error(`The user didn’t allow starting “${config.name}”. Nothing was run.`), { code: "declined" });
      item.approvedServers.add(fingerprint);
    };
    const agent = { ensureSite, approveServer };
    // The tools work with no pane showing the page; a page the reaper closed reopens first (2.2553.1 YX → xX).
    const requirePage = async () => {
      const item = entry();
      await revive(item);
      if (!alive(item) || !item.url || item.url === "about:blank") throw new Error("Nothing is open in the preview. Start a server with preview_start or open a page with navigate first.");
      await ensureSite(item.view.webContents.getURL());
      armReap(item, true);
      return drive(item);
    };
    // After a click or key press: a navigation it started settles (bounded), and an outside site it was kept from is named.
    const settle = async (item, since) => {
      await sleep(150);
      if (alive(item) && item.view.webContents.isLoading?.()) {
        await new Promise((resolve) => { const timer = setTimeout(resolve, 3000); item.view.webContents.once("did-stop-loading", () => { clearTimeout(timer); resolve(); }); });
      }
      const blocked = item.blocked && item.blocked.at >= since ? item.blocked : null;
      // A download the click started: the user picks where to save it in the Save dialog, or it was cancelled (unseen page).
      const download = item.download && item.download.at >= since ? item.download : null;
      // A JavaScript dialog the page opened meanwhile, which never showed (the Page.javascriptDialogOpening handler).
      const dialog = item.dialog && item.dialog.at >= since ? item.dialog : null;
      return { url: alive(item) ? item.view.webContents.getURL() : item.url, ...(blocked ? { blocked: { host: blocked.host, declined: blocked.declined === true || item.declinedHosts.has(blocked.host) } } : {}),
        ...(dialog ? { dialog: { type: dialog.type, message: dialog.message, returned: dialog.returned } } : {}),
        ...(download ? { download: { file: download.file, state: download.state, ...(download.reason === "not-shown" ? { note: "The preview isn’t on screen, so the download was cancelled. Ask the user to show the Preview pane." } : download.state === "saving" ? { note: "The user chooses where to save it in the Save dialog." } : {}) } } : {}) };
    };
    const isolated = (item, code, gesture = false) => item.view.webContents.executeJavaScriptInIsolatedWorld(scripts.WORLD_ID, [{ code }], gesture);
    const reveal = () => broadcast({ kind: "preview-reveal", sessionId });
    return {
      sessionId,
      cwd: session.cwd,
      launchInfo: () => launchInfo(entry().cwd),
      snapshot: () => snapshot(entry()),
      reveal,
      async start({ name, url } = {}) {
        drive();
        if (url && !name) { reveal(); return { page: await navigate(sessionId, url, { agent }), server: null, reused: false }; }
        reveal();
        return startServer(sessionId, name, { agent });
      },
      stop: (name) => stopServer(sessionId, name),
      logs: (name, options) => serverLogs(sessionId, name, { ...options, ansi: false }),
      list() {
        const item = entry(), info = launchInfo(item.cwd);
        const running = new Map([...servers.values()].filter((server) => server.cwd === item.cwd).map((server) => [server.name.toLowerCase(), server]));
        return {
          launchFile: info.file, exists: info.exists, error: info.error, problems: info.problems,
          servers: info.configs.map((config) => { const server = running.get(config.name.toLowerCase()); return { name: config.name, port: server?.port ?? config.port, url: server?.url ?? launch.configUrl(config), status: server?.status ?? "stopped", attach: config.attach }; }),
          page: alive(item) && item.url ? { url: item.view.webContents.getURL(), title: item.view.webContents.getTitle(), loading: item.loading }
            : item.reclaimed && item.url ? { url: item.url, title: item.title, loading: false, reclaimed: true } : null,
          viewport: { ...item.viewport },
        };
      },
      async navigate(url) {
        const item = entry();
        if (url === "back" || url === "forward") {
          await requirePage();
          history(sessionId, url);
          await sleep(400);
          return { url: item.view.webContents.getURL(), title: item.view.webContents.getTitle() };
        }
        const target = launch.parseUserUrl(url, item.cwd, home);
        if (!target) throw new Error("Give a URL to open.");
        drive(item);
        reveal();
        return navigate(sessionId, target, { agent });
      },
      async screenshot({ quality = 80 } = {}) {
        const item = await requirePage();
        const bytes = await capture(sessionId, { format: "jpeg", quality: Math.max(30, Math.min(95, Math.round(quality))) });
        // c4i: the frame (the image's own pixels, 2× the page's CSS pixels on a Retina display) and the tab's geometry,
        // which the agent's points from this screenshot belong to (R4f: S4i / b4i map them back).
        const shot = coordinates.remember(item, imageSize(bytes));
        return { data: bytes.toString("base64"), mimeType: "image/jpeg", ...(shot.screenshotWidth > 0 && shot.screenshotHeight > 0 ? { width: shot.screenshotWidth, height: shot.screenshotHeight } : {}) };
      },
      async readPage({ filter = "all", maxChars = 50000 } = {}) {
        const item = await requirePage();
        return isolated(item, scripts.readPageScript({ filter, maxChars }));
      },
      async pageText({ maxChars = 50000 } = {}) {
        const item = await requirePage();
        return isolated(item, scripts.pageTextScript({ maxChars }));
      },
      async click({ ref = null, selector = null, x = null, y = null, doubleClick = false } = {}) {
        const item = await requirePage();
        // preview-15 (C4i): a point from a screenshot taken before the page's zoom or size changed is refused; R4f (S4i,
        // b4i): one outside the screenshot's frame is refused, and the rest go to the page in its CSS pixels.
        const at = !ref && !selector && Number.isFinite(x) && Number.isFinite(y) ? await coordinates.point(item, "click", x, y) : { x, y };
        const since = Date.now();
        const count = doubleClick ? 2 : 1;
        if (onScreen(item)) {
          let point = { x: at.x, y: at.y, label: "" };
          if (ref || selector) {
            point = await isolated(item, scripts.locateScript({ ref, selector }));
            if (point?.error) throw new Error(point.error);
          } else if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Name an element (ref or selector) or a point (x, y).");
          await cdp(item, "Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none" });
          for (let i = 1; i <= count; i++) {
            await cdp(item, "Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: i });
            await cdp(item, "Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: i });
          }
          return { clicked: point.label || (ref || selector || `(${x}, ${y})`), ...(await settle(item, since)) };
        }
        if (!ref && !selector && (!Number.isFinite(x) || !Number.isFinite(y))) throw new Error("Name an element (ref or selector) or a point (x, y).");
        const result = await isolated(item, scripts.domClickScript({ ref, selector, x: at.x, y: at.y, clickCount: count }), true);
        if (result?.error) throw new Error(result.error);
        return { clicked: ref || selector || `(${x}, ${y})`, ...(await settle(item, since)) };
      },
      async type({ text, ref = null, selector = null, clear = false, submit = false } = {}) {
        const item = await requirePage();
        if (typeof text !== "string") throw new Error("Give the text to type.");
        if (ref || selector) {
          const located = await isolated(item, scripts.locateScript({ ref, selector, focus: true }));
          if (located?.error) throw new Error(located.error);
        }
        if (clear) await isolated(item, "document.execCommand('selectAll'); document.execCommand('delete'); true", true);
        if (text) await cdp(item, "Input.insertText", { text });
        if (submit) await this.press({ keys: "Enter" });
        return { typed: text.length };
      },
      async press({ keys } = {}) {
        const item = await requirePage();
        const since = Date.now();
        const list = (Array.isArray(keys) ? keys : String(keys || "").split(/\s+/)).filter(Boolean);
        if (!list.length) throw new Error("Name the keys to press, e.g. \"Enter\" or \"cmd+a\".");
        for (const combo of list.slice(0, 50)) {
          const key = scripts.parseKeyCombo(combo);
          if (!key) throw new Error(`Unknown key: ${combo}`);
          if (onScreen(item)) {
            const base = { key: key.key, code: key.code, windowsVirtualKeyCode: key.keyCode, nativeVirtualKeyCode: key.keyCode, modifiers: key.modifiers };
            const token = Symbol('preview-agent-key'), pending = item.group.inputBegins ??= new Map();
            item.group.syntheticInputUntil = beginSyntheticInput(pending, token);
            try {
              await cdp(item, "Input.dispatchKeyEvent", { type: key.text ? "keyDown" : "rawKeyDown", ...base, ...(key.text ? { text: key.text, unmodifiedText: key.text } : {}), ...(key.commands.length ? { commands: key.commands } : {}) });
              await cdp(item, "Input.dispatchKeyEvent", { type: "keyUp", ...base });
            } finally { item.group.syntheticInputUntil = endSyntheticInput(pending, token, item.group.syntheticInputUntil); }
          } else if (key.text && key.text.length === 1 && key.key !== "Enter" && key.text !== "\r") {
            await cdp(item, "Input.insertText", { text: key.text });
          } else {
            await isolated(item, scripts.domKeyScript({ key: key.key, modifiers: key.mods }), true);
          }
        }
        return { pressed: list, ...(await settle(item, since)) };
      },
      // scroll / hover / find (agent-tools/preview.mjs): an element into view or a box by wheel ticks; the pointer
      // over an element (native input on screen, its pointer events otherwise); elements by role, name or text.
      async scroll({ ref = null, selector = null, x = null, y = null, direction = null, amount = 3 } = {}) {
        const item = await requirePage();
        if (!ref && !selector && direction === null) throw new Error("Name an element (ref or selector) to scroll into view, or a direction to scroll.");
        const at = !ref && !selector && Number.isFinite(x) && Number.isFinite(y) ? await coordinates.point(item, "scroll", x, y) : { x, y };
        const result = await isolated(item, scripts.scrollScript({ ref, selector, x: at.x, y: at.y, direction, amount }));
        if (result?.error) throw new Error(result.error);
        return result;
      },
      async hover({ ref = null, selector = null, x = null, y = null } = {}) {
        const item = await requirePage();
        if (!ref && !selector && (!Number.isFinite(x) || !Number.isFinite(y))) throw new Error("Name an element (ref or selector) or a point (x, y).");
        const at = !ref && !selector ? await coordinates.point(item, "hover", x, y) : { x, y };
        if (onScreen(item)) {
          let point = { x: at.x, y: at.y, label: "" };
          if (ref || selector) {
            point = await isolated(item, scripts.locateScript({ ref, selector }));
            if (point?.error) throw new Error(point.error);
          }
          await cdp(item, "Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none" });
          await sleep(100);
          return { hovered: point.label || ref || selector || `(${x}, ${y})` };
        }
        const result = await isolated(item, scripts.domHoverScript({ ref, selector, x: at.x, y: at.y }), true);
        if (result?.error) throw new Error(result.error);
        return { hovered: result.hovered || ref || selector || `(${x}, ${y})` };
      },
      async find({ query, limit = 20 } = {}) {
        const item = await requirePage();
        if (typeof query !== "string" || !query.trim()) throw new Error("Give the text to look for.");
        const result = await isolated(item, scripts.findScript({ query, limit }));
        if (result?.error) throw new Error(result.error);
        return { ...result, url: item.view.webContents.getURL() };
      },
      async inspect({ ref = null, selector = null, properties = [] } = {}) {
        const item = await requirePage();
        const result = await isolated(item, scripts.inspectScript({ ref, selector, properties }));
        if (result?.error) throw new Error(result.error);
        return result;
      },
      async fill({ ref = null, selector = null, value = "" } = {}) {
        const item = await requirePage();
        const result = await isolated(item, scripts.fillScript({ ref, selector, value: String(value) }), true);
        if (result?.error) throw new Error(result.error);
        return result;
      },
      /** preview_eval: an expression in the page's own context (debugging; promises are awaited, the value returned as JSON). */
      async evaluate({ expression } = {}) {
        const item = await requirePage();
        if (typeof expression !== "string" || !expression.trim()) throw new Error("Give the JavaScript expression to run.");
        if (expression.length > 20000) throw new Error("The expression is too long (20,000 characters at most).");
        const reply = await cdp(item, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true, timeout: 10000, replMode: true });
        if (reply?.exceptionDetails) {
          const details = reply.exceptionDetails;
          throw new Error(`Uncaught ${details.exception?.description || details.exception?.value || details.text || "error"}`.slice(0, 4000));
        }
        const remote = reply?.result ?? {};
        let text;
        if (remote.type === "undefined") text = "undefined";
        else if (Object.hasOwn(remote, "value")) { try { text = JSON.stringify(remote.value, null, 2); } catch { text = String(remote.value); } }
        else text = remote.description ?? remote.type ?? "";
        return { text: text.length > 20000 ? `${text.slice(0, 20000)}\n… (truncated)` : text, type: remote.subtype || remote.type };
      },
      /** null: the page was reaped while hidden, so its earlier output is gone (RECLAIMED_NOTE). */
      consoleMessages({ level = "all", lines = 50, pattern = "", clear = false } = {}) {
        const item = entry();
        if (item.reclaimed && !alive(item)) return null;
        const order = { error: 3, warn: 2 };
        let list = item.console.filter((line) => level === "all" || (level === "error" ? line.level === "error" : (order[line.level] ?? 0) >= 2));
        if (pattern) { const needle = String(pattern).toLowerCase(); list = list.filter((line) => line.text.toLowerCase().includes(needle)); }
        list = list.slice(-Math.max(1, Math.min(CONSOLE_LIMIT, lines)));
        if (clear) item.console.length = 0;
        return list;
      },
      networkRequests({ filter = "all", limit = 50, urlPattern = "" } = {}) {
        const item = entry();
        if (item.reclaimed && !alive(item)) return null;
        let list = item.network.filter((request) => filter !== "failed" || request.failed || (request.status ?? 0) >= 400);
        if (urlPattern) { const needle = String(urlPattern).toLowerCase(); list = list.filter((request) => request.url.toLowerCase().includes(needle)); }
        return list.slice(-Math.max(1, Math.min(NETWORK_LIMIT, limit)));
      },
      async resize({ preset, width, height, colorScheme } = {}) {
        const custom = preset === undefined && Number.isFinite(width) && Number.isFinite(height) ? "custom" : preset;
        const viewport = emulate(sessionId, { preset: custom, width, height, colorScheme, agent: true });
        await entry().emulating;
        return viewport;
      },
    };
  }

  function rebindStorage() {
    for (const old of [...previews.values()]) {
      if (isCoworkSession(old.id)) continue;
      const tabs = [...old.group.tabs.values()];
      if (!tabs.some(tab => tab.storagePartition && tab.storagePartition !== storageFor(tab))) continue;
      const replay = previewStorageRebindTabs(tabs, old.tabId, storageMode());
      const host = { host: old.host, paneBounds: old.paneBounds, visible: old.visible, occluded: old.occluded };
      for (const tab of tabs) {
        stopSelection(tab, true);clearTimeout(tab.notifyTimer);clearTimeout(tab.reapTimer);
        const view = tab.view;tab.view = null;tab.host = null;
        try { if (view) { tab.parent?.contentView.removeChildView(view); view.webContents.close(); } } catch { /* closed */ }
      }
      old.group.tabs.clear();previews.delete(old.id);closedTabs.delete(old.id);
      const first = preview(old.id);
      for (const key of ['subscribers', 'approvedHosts', 'declinedHosts', 'approvedServers', 'recentFiles']) first.group[key] = old.group[key];
      let selected = first;
      replay.forEach((item, index) => {
        const next = index === 0 ? first : preview(old.id, true);
        next.placeholder = false;
        if (item.active) selected = next;
        void navigate(old.id, item.url, { tabId: next.tabId }).catch(error => logger.warn?.('preview: storage rebind failed', error));
      });
      previews.set(old.id, selected);Object.assign(selected, host);place(selected);notify(selected, true);
    }
  }

  async function clearBrowsingData(entry) {
    const name = entry.storagePartition ?? storageFor(entry);
    const ses = electronSession.fromPartition(name);
    // Current VM reports failures instead of silently claiming the data is gone.
    if (ses.clearData) await ses.clearData();
    else { await ses.clearStorageData(); await ses.clearCache?.(); }
    await ses.clearAuthCache?.();
    return snapshot(entry);
  }

  /**
   * The app is quitting (or the service goes away): every dev server gets SIGTERM, up to graceMs to exit, then SIGKILL
   * for whatever is left of its process group, before this resolves (main.cjs awaits it): a server that ignores TERM
   * or shuts down slowly never outlives the app holding its port. The pages close at once.
   */
  function dispose({ graceMs = 2000 } = {}) {
    // The pages' last frames are taken first (bounded; the pages stay open until then), the servers stop meanwhile.
    const framesSaved = frameDir ? Promise.race([saveFrames().catch(() => {}), sleep(FRAME_TIMEOUT_MS + 400)]) : null;
    const running = [...servers.values()].filter((server) => server.child?.pid);
    for (const server of servers.values()) stopProcess(server);
    servers.clear();
    const pagesClosed = framesSaved ? framesSaved.then(() => closePages()) : (closePages(), Promise.resolve());
    if (!running.length) return pagesClosed;
    const exits = running.map(({ child }) => child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise((resolve) => child.once("exit", resolve)));
    return Promise.all([pagesClosed, Promise.race([Promise.all(exits), sleep(graceMs)]).then(() => { for (const { child } of running) signalGroup(child, "SIGKILL"); })]).then(() => {});
  }
  function closePages() {
    for (const entry of allPreviews()) {
      stopSelection(entry, true);
      clearTimeout(entry.notifyTimer);
      clearTimeout(entry.reapTimer);
      if (alive(entry)) { try { entry.view.webContents.close(); } catch { /* gone */ } }
    }
    previews.clear();closedTabs.clear();
    for (const [sender, cleanup] of subscriberCleanup) sender.off("destroyed", cleanup);
    subscriberCleanup.clear();
    for (const record of launchWatchers.values()) { clearTimeout(record.timer); for (const watcher of [record.folder, record.claude]) { try { watcher?.close(); } catch { /* closed */ } } }
    launchWatchers.clear();
    if (parking && !parking.isDestroyed()) parking.destroy();
    parking = null;
  }
  /** The renderer's desktop:call actions (validated here; `sender` is the calling webContents). */
  async function call(sender, action, p = {}) {
    const id = typeof p.sessionId === "string" ? p.sessionId : "";
    await storageReady;
    switch (action) {
      case "preview-state": return state(sender, id);
      case "preview-tab-reopen": subscribe(preview(id), sender); return reopenTab(id);
      case "preview-tab-select-index": return selectTabIndex(id, p.index);
      case "preview-tab-cycle": return cycleTab(id, p.direction);
      case "preview-tab-new": subscribe(preview(id), sender); return newTab(id);
      case "preview-tab-activate": return activateTab(id, p.tabId);
      case "preview-tab-close": return closeTab(id, p.tabId, { others: p.others === true, decision: p.decision ?? null });
      case "preview-tab-reorder": return reorderTab(id, p.tabId, p.toIndex);
      case "preview-tab-external": { const tab = tabEntry(id, p.tabId); if (!/^https?:/i.test(tab.url)) throw new Error("This only works for websites."); await shell.openExternal(tab.url); return true; }
      case "preview-attach": return attach(sender, p);
      case "preview-detach": return detach(sender, p);
      case "preview-occlude": return occlude(sender, p);
      case "preview-focus": return focusPage(sender, p);
      case "preview-navigate": subscribe(preview(id), sender); return userNavigate(id, p.url);
      case "preview-link-open": subscribe(preview(id), sender); return openTranscriptLink(id, p.url);
      case "preview-address-navigate": subscribe(preview(id), sender); return addressNavigate(id, p.text);
      case "preview-selection": return selectElement(sender, p);
      case "preview-history": return history(id, p.action);
      case "preview-emulate": return emulate(id, { preset: p.preset, width: p.width, height: p.height, colorScheme: p.colorScheme });
      case "preview-capture": {
        const entry = preview(id), bytes = new Uint8Array(await capture(id, { format: 'png' }));
        // CDP captures the child page's pixel density, which can differ from the
        // renderer (emulated devices and offscreen hosts). Preserve its displayed scale.
        const displayWidth = (viewRect(entry)?.width ?? 0) / (sender.getZoomFactor?.() || 1);
        return { bytes, name: 'preview.png', type: 'image/png', displayWidth };
      }
      case "preview-devtools": return openDevTools(id);
      case "preview-external": return openExternal(id);
      case "preview-download-reveal": {
        const saved = previews.get(id)?.download?.path;
        if (!saved || !fs.existsSync(saved)) throw new Error("The downloaded file isn’t there any more.");
        shell.showItemInFolder(saved);
        return true;
      }
      case "preview-server-start": {
        subscribe(preview(id), sender);
        preview(id).agentDriven = false; // the user's own Start: the page is theirs
        try { const result = await startServer(id, p.name); return { ok: true, server: result.server }; }
        catch (error) { return { ok: false, code: error.code || "error", message: error.message, ...(error.heldPort ? { heldPort: error.heldPort } : {}) }; }
      }
      case "preview-last-frame": return readFrame(id);
      case "preview-last-frame-discard": discardFrame(id); return snapshot(preview(id));
      case "preview-server-stop": return stopServer(id, p.name);
      case "preview-server-logs": return serverLogs(id, p.name, { lines: Number(p.lines) || 500 });
      case "preview-server-clear-logs": return clearLogs(id, p.name);
      // B39 Allowed sites (c25b1be4a PreviewAllowedSitesModal over getPreviewAllowedOrigins / addPreviewAllowedOrigin /
      // removePreviewAllowedOrigin / clearPreviewAllowedOrigins): app-wide, no session. Removing a site (or clearing
      // the list) also drops the sessions' own approvals for it, so the agent asks again (TNn/ENn clear the grants).
      case "preview-allowed-origins": return allowedOrigins.allowedOriginEntries(getAllowedOrigins());
      case "preview-allowed-origin-add": {
        const outcome = allowedOrigins.addAllowedOrigin(getAllowedOrigins(), p.origin, { schemeless: p.schemeless === true });
        if (outcome.result === allowedOrigins.ALLOWED_ORIGIN_RESULTS.Ok) {
          try { await setAllowedOrigins(outcome.list); } catch { return allowedOrigins.ALLOWED_ORIGIN_RESULTS.Unavailable; }
        }
        return outcome.result;
      }
      case "preview-allowed-origin-remove": {
        const outcome = allowedOrigins.removeAllowedOrigin(getAllowedOrigins(), p.origin);
        if (!outcome.removed) return false;
        await setAllowedOrigins(outcome.list);
        for (const entry of previews.values())
          for (const host of [...entry.group.approvedHosts]) if (allowedOrigins.hostMatchesOrigin(host, outcome.origin)) entry.group.approvedHosts.delete(host);
        return true;
      }
      case "preview-allowed-origins-clear": {
        await setAllowedOrigins([]);
        for (const entry of previews.values()) entry.group.approvedHosts.clear();
        return true;
      }
      // Settings › Code › Browser › Keep cookies (c71860c77-DzP8HoeV Kr) reads and sets the same mode without a session.
      case "preview-storage-read": return { previewStorage: storageMode() };
      case "preview-storage": {
        if (id) preview(id);
        if (!PREVIEW_STORAGE_MODES.includes(p.mode)) throw new Error("Unknown storage mode.");
        await setStorageMode(p.mode);
        selectedStorageMode = p.mode;
        setKeepCookies(p.mode !== 'none');
        rebindStorage();
        for (const entry of previews.values()) notify(entry, true);
        return id ? snapshot(preview(id)) : { previewStorage: storageMode() };
      }
      case "preview-keep-cookies": {
        if (typeof p.enabled !== "boolean") throw new Error("Unknown operation.");
        return call(sender, 'preview-storage', { sessionId: id, mode: p.enabled ? 'shared' : 'none' });
      }
      case "preview-clear-data": return clearBrowsingData(preview(id));
      case "preview-detect": {
        // The start page's dev-server detection (2.31226.0 detectServerCandidates → rUi): the session folder's
        // package.json scripts, each with its framework and validation.
        return launch.detectServerCandidates(projectFiles(preview(id).cwd));
      }
      case "preview-use-server": {
        // A detected server the user chose (start page "Use this", 2.31226.0 addServerFromCandidate): validated again,
        // its script still in package.json, then appended to .claude/launch.json (created when missing, an existing
        // one edited in place) — {ok} or {ok: false, reason: "name-exists" | "write-failed" | a validation reason}.
        // The pane then runs it as its own Run (Si onServerAdded).
        const entry = preview(id);
        const candidate = p.candidate;
        if (!candidate || typeof candidate !== "object" || typeof candidate.runtimeExecutable !== "string" || !Array.isArray(candidate.runtimeArgs)) return { ok: false, reason: "write-failed" };
        try {
          const problem = launch.serverCandidateProblem(candidate, projectFiles(entry.cwd));
          if (problem) return { ok: false, reason: problem };
          const config = launch.candidateConfiguration(candidate);
          const file = path.join(entry.cwd, launch.LAUNCH_FILE);
          let text = null;
          try { text = fs.readFileSync(file, "utf8"); } catch (error) { if (error?.code !== "ENOENT") return { ok: false, reason: "write-failed" }; }
          if (text === null) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            if (!launch.insideFolderReal(entry.cwd, path.dirname(file))) return { ok: false, reason: "write-failed" };
            fs.writeFileSync(file, launch.launchConfigText(config), { flag: "wx" });
          } else {
            // A launch.json that resolves outside the project (a link) is never written through.
            if (!launch.insideFolderReal(entry.cwd, file)) return { ok: false, reason: "write-failed" };
            const next = launch.withServerConfiguration(text, config);
            if (next.status !== "ok") return { ok: false, reason: next.status === "name-exists" ? "name-exists" : "write-failed" };
            fs.writeFileSync(file, next.text);
          }
        } catch { return { ok: false, reason: "write-failed" }; }
        launchCache.delete(entry.cwd);
        notifyFolder(entry.cwd);
        return { ok: true, name: launch.candidateConfiguration(candidate).name };
      }
      case "preview-auto-verify": {
        // Servers & settings › Enable/Disable auto verify (2.2553.1 U_): top-level autoVerify in .claude/launch.json,
        // written in place so the file's comments and layout stay.
        if (typeof p.enabled !== "boolean") throw new Error("Unknown operation.");
        const entry = preview(id);
        const file = path.join(entry.cwd, launch.LAUNCH_FILE);
        let text;
        try { text = fs.readFileSync(file, "utf8"); } catch { throw new Error("No .claude/launch.json in this folder yet."); }
        fs.writeFileSync(file, launch.withAutoVerify(text, p.enabled));
        launchCache.delete(entry.cwd);
        notifyFolder(entry.cwd);
        return snapshot(entry);
      }
      // Servers & settings › Files › Open file… (2.2553.1 pickHtmlFile): an .html file of the session folder.
      case "preview-open-file": {
        const entry = preview(id);
        const window = windowOf(sender);
        const options = { title: "Open file", defaultPath: entry.cwd, properties: ["openFile"], filters: [{ name: "HTML", extensions: ["html", "htm"] }] };
        const dialog = electron.dialog;
        if (!dialog?.showOpenDialog) throw new Error("Unknown operation.");
        const picked = window && !window.isDestroyed?.() ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
        if (picked.canceled || !picked.filePaths?.[0]) return { canceled: true };
        return openFile(sender, id, picked.filePaths[0]);
      }
      // A recently previewed file of this session (the Files group's list).
      case "preview-open-recent": {
        const entry = preview(id);
        if (!entry.recentFiles.includes(p.path)) throw new Error("Unknown operation.");
        return openFile(sender, id, p.path);
      }
      case "preview-reveal-config": {
        const entry = preview(id);
        const file = path.join(entry.cwd, launch.LAUNCH_FILE);
        if (!fs.existsSync(file)) throw new Error("No .claude/launch.json in this folder yet.");
        const failure = await shell.openPath(file);
        if (failure) throw new Error(failure);
        return true;
      }
      default: throw new Error("Unknown operation.");
    }
  }
  return { call, forSession, snapshot: (id) => snapshot(preview(id)), dispose, launchInfo, windowClosed, PARTITION, EPHEMERAL_PARTITION, _previews: previews, _servers: servers };
}

module.exports = { createPreviewService, previewShortcut, PARTITION, EPHEMERAL_PARTITION, PRESETS, REAP_HIDDEN_MS, RECLAIMED_NOTE };
