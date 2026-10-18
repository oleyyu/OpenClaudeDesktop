// Application menu template and window lifecycle decisions, kept pure so they
// are unit-testable. index.chunk-ChZ67Jhw.js ANr builds the menu bar in the
// order App (Gtr), File (lwr), Edit (ISr), View (pNr), Go (mwr), Window (kNr),
// Help (Djr); the Claude-only Chat/Developer/area menus have no local
// counterpart. Each click is a desktop event; main.cjs handles the window,
// zoom and log events itself and forwards the rest to the renderer.
const { ZOOM_STEP } = require("./window-chrome.cjs");
// R4e-zoom: the original 2.42304.0 Zoom In / Zoom Out enabled checks (_Pi / vPi) and the four-item refresh (PPi).
const { bindZoomMenu } = require("./generated/r4e-zoom.cjs");
// Labels are translated when a template is built (installAppMenu runs again
// after the main process sets the locale or the language preference changes).
const { t, getLocale } = require("./i18n/index.mjs");
// Electron names label-less role items in English; other locales name them
// explicitly (en-US keeps the native role labels).
const roleLabel = (text, values) => getLocale() === "en-US" ? {} : { label: t(text, values) };
const APP_NAME = "OpenClaude Desktop";
const SEPARATOR = Object.freeze({ type: "separator" });
// RZ(e, dispatch, "cmd"): when a menu item fires through its own accelerator
// with ⌘ held, the chord reached the menu because the page did not take it
// (the renderer owns ⌘⇧D/⌘⇧F/⌘\/⌘⇧[/⌘⇧]/⌘⇧K/⌘/ and preventDefaults them when
// it acts), so the click is not dispatched again. Mouse clicks always are.
const rendererOwned = (event) => event?.triggeredByAccelerator === true && event.metaKey === true;
const dispatch = (emit, payload) => (_item, window, event) => { if (!rendererOwned(event)) emit(payload, window); };
// hNr(n, "ctrl") for the Split View items: their ⌃ chords are matched by the renderer (source-split-view.jsx,
// official OR), so a click that came through its own accelerator with ⌃ held is not dispatched twice.
const rendererOwnedCtrl = (event) => event?.triggeredByAccelerator === true && event.ctrlKey === true;
const splitDispatch = (emit, command) => (_item, window, event) => { if (!rendererOwnedCtrl(event)) emit({ kind: "split-view", command }, window); };
// Gtr: About, Settings… (KK shows the main window first, then navigates),
// Services, Hide / Hide Others / Show All, Quit. The update items (Wtr) have
// no local updater.
function appSubmenu(emit) {
  return {
    label: "OpenClaude Desktop",
    submenu: [
      { role: "about", ...roleLabel("About {appName}", { appName: APP_NAME }) },
      SEPARATOR,
      { label: t("Settings…"), accelerator: "CommandOrControl+,", click: (_item, window) => emit({ kind: "open-settings" }, window) },
      SEPARATOR,
      { role: "services", ...roleLabel("Services") },
      SEPARATOR,
      { role: "hide", ...roleLabel("Hide {appName}", { appName: APP_NAME }) },
      { role: "hideOthers", ...roleLabel("Hide Others") },
      { role: "unhide", ...roleLabel("Show All") },
      SEPARATOR,
      { role: "quit", ...roleLabel("Quit {appName}", { appName: APP_NAME }) },
    ],
  };
}
// lwr: New Session (cwr, CmdOrCtrl+N), the ewr Open… block (Open File…, ZCr
// CmdOrCtrl+O: the renderer opens it in the Files pane, starting a session
// draft in its folder when no open session holds it; Open Folder…,
// CmdOrCtrl+Shift+O), then nwr. iwr
// names the ⌘W item: "Close Session" (xdFFXdcjAb) while the renderer reports
// a session view (lSr: sessionPanes.diff.enabled, here session.open), else
// "Close Pane" while it reports a closable pane; either comes with Close
// Window on ⌘⇧W. Otherwise ⌘W is Close Window (twr, role close, which hides
// the main window) with a hidden ⌘⇧W twin. rwr then appends Reopen Closed
// Session (t77UbkPnXg, CmdOrCtrl+Shift+T, registerAccelerator, enabled from
// hSr) only while the renderer reports it available.
// owr: the renderer's keydown owns ⌘W in the main window (pR), so a ⌘W that
// reached Close Session through its accelerator is marked and main.cjs does
// not dispatch it again; a pane window's ⌘W closes that window.
function fileMenuItems({ closePane, session = { open: false }, reopenClosed = { available: false, enabled: false }, newWindow = true, emit }) {
  const closeWindow = (accelerator = "CmdOrCtrl+W") => ({ label: t("Close Window"), accelerator, role: "close" });
  const closeSession = (_item, window, event) => emit({ kind: "close-session", ...(rendererOwned(event) ? { accelerator: true } : {}) }, window);
  const close = session.open
    ? [{ label: t("Close Session"), accelerator: "CmdOrCtrl+W", click: closeSession }, closeWindow("CmdOrCtrl+Shift+W")]
    : closePane
      ? [{ label: t("Close Pane"), accelerator: "CmdOrCtrl+W", click: (_item, window) => emit({ kind: "close-pane" }, window) }, closeWindow("CmdOrCtrl+Shift+W")]
      : [closeWindow(), { ...closeWindow("CmdOrCtrl+Shift+W"), visible: false, acceleratorWorksWhenHidden: true }];
  const reopen = reopenClosed.available
    ? [{ label: t("Reopen Closed Session"), accelerator: "CmdOrCtrl+Shift+T", registerAccelerator: true, enabled: reopenClosed.enabled === true,
      click: dispatch(emit, { kind: "reopen-closed" }) }]
    : [];
  return [
    { label: t("New Session"), accelerator: "CmdOrCtrl+N", click: (_item, window) => emit({ kind: "new-session" }, window) },
    // ⇧⌘N is Claude Desktop's "New session with current settings" (2.2553.1 palette new_code_session_from_current).
    { label: t("New Session with Current Settings"), accelerator: "CmdOrCtrl+Shift+N", click: (_item, window) => emit({ kind: "new-session-current" }, window) },
    // B27 (cd377abb5 si): a sidebar-less new-session popout (main.cjs openSessionPopout, a "code-draft") that becomes
    // that session's popout on its first send (no accelerator: the official popouts have none). Disabled at
    // window-registry.cjs MAX_SESSION_POPOUTS, with the reason as its macOS tooltip, so the item never just does nothing.
    { label: t("New Window"), enabled: newWindow !== false, ...(newWindow === false ? { toolTip: t("Close a window before opening another.") } : {}),
      click: (_item, window) => emit({ kind: "new-window" }, window) },
    SEPARATOR,
    { label: t("Open File…"), accelerator: "CmdOrCtrl+O", click: (_item, window) => emit({ kind: "open-file" }, window) },
    { label: t("Open Folder…"), accelerator: "CmdOrCtrl+Shift+O", click: (_item, window) => emit({ kind: "open-folder" }, window) },
    SEPARATOR,
    ...close,
    ...reopen,
  ];
}
// ISr: the Find submenu after FSr — Find… (CmdOrCtrl+F, BSr), Find Next
// (CmdOrCtrl+G) and Find Previous (CmdOrCtrl+Shift+G, USr → the renderer's
// step request). The renderer's find bar (source-find-bar.jsx, ZB) owns the
// chords, so the accelerators are shown but not registered; a click emits
// find-open / find-step. Current Lli appends Find in Files… without an accelerator.
function findSubmenu(emit, findInFiles) {
  return {
    label: t("Find"),
    submenu: [
      { label: t("Find…"), accelerator: "CmdOrCtrl+F", registerAccelerator: false, click: (_item, window) => emit({ kind: "find-open" }, window) },
      { label: t("Find Next"), accelerator: "CmdOrCtrl+G", registerAccelerator: false, click: (_item, window) => emit({ kind: "find-step", forward: true }, window) },
      { label: t("Find Previous"), accelerator: "CmdOrCtrl+Shift+G", registerAccelerator: false, click: (_item, window) => emit({ kind: "find-step", forward: false }, window) },
      SEPARATOR,
      { id: "find-in-files", label: t("Find in Files…"), enabled: findInFiles?.enabled === true, click: (_item, window) => emit({kind:"find-in-files"},window) },
    ],
  };
}
// ISr/FSr("mac") in place of the editMenu role: Undo/Redo, Cut/Copy/Paste,
// Paste and Match Style (with the hidden CmdOrCtrl+Shift+V twin), Delete and
// Select All, then a separator and the Find submenu. FSr has no Speech submenu.
function editMenuItems(emit = () => {}, findInFiles) {
  return [
    { label: t("Undo"), accelerator: "CmdOrCtrl+Z", role: "undo" },
    { label: t("Redo"), accelerator: "CmdOrCtrl+Shift+Z", role: "redo" },
    SEPARATOR,
    { label: t("Cut"), accelerator: "CmdOrCtrl+X", role: "cut" },
    { label: t("Copy"), accelerator: "CmdOrCtrl+C", role: "copy" },
    { label: t("Paste"), accelerator: "CmdOrCtrl+V", role: "paste" },
    { label: t("Paste and Match Style"), accelerator: "CmdOrCtrl+Alt+Shift+V", role: "pasteAndMatchStyle" },
    { label: t("Paste and Match Style"), accelerator: "CmdOrCtrl+Shift+V", visible: false, acceleratorWorksWhenHidden: true, role: "pasteAndMatchStyle" },
    { label: t("Delete"), role: "delete" },
    { label: t("Select All"), accelerator: "CmdOrCtrl+A", role: "selectAll" },
    SEPARATOR,
    findSubmenu(emit, findInFiles),
  ];
}
// Go menu: index.chunk-D6ATlqeD.js gyr() = {label:_yr() "Go", submenu:
// [...Cyr("Command+[","Command+]","cmd"), ...wyr(...)]}, placed after View in
// jOr. Cyr pairs each direction: a hidden twin ({...a, visible:!1}) that owns
// the registered accelerator, then the visible item (id "go-back" /
// "go-forward", registerAccelerator:!1, enabled from xyr.canGoBack /
// canGoForward, which Syr updates via getMenuItemById). Both clicks navigate;
// here that is the {kind:"navigate", delta} desktop event. The renderer
// preventDefaults ⌘[ / ⌘] (main.jsx key handler), so like ⌘B the accelerator
// does not also fire. index.chunk-ChZ67Jhw.js Swr then adds, after a
// separator, wwr's Previous/Next Session (Command+Shift+[ / ], RZ →
// dispatchCycleSession) and, after another separator, Search…
// (Command+Shift+K, RZ → dispatchOpenCommandPalette(true)). Cwr's area
// checkboxes need at least two areas, so they never appear here.
function goMenuItems({ canGoBack, canGoForward, emit }) {
  const back = { label: t("Back"), accelerator: "Command+[", click: () => emit({ kind: "navigate", delta: -1 }) };
  const forward = { label: t("Forward"), accelerator: "Command+]", click: () => emit({ kind: "navigate", delta: 1 }) };
  return [
    { ...back, visible: false },
    { ...back, id: "go-back", registerAccelerator: false, enabled: canGoBack === true },
    { ...forward, visible: false },
    { ...forward, id: "go-forward", registerAccelerator: false, enabled: canGoForward === true },
    SEPARATOR,
    { label: t("Previous Session"), accelerator: "Command+Shift+[", click: dispatch(emit, { kind: "cycle-session", delta: -1 }) },
    { label: t("Next Session"), accelerator: "Command+Shift+]", click: dispatch(emit, { kind: "cycle-session", delta: 1 }) },
    SEPARATOR,
    { label: t("Search…"), accelerator: "Command+Shift+K", click: dispatch(emit, { kind: "open-search" }) },
  ];
}
// index.chunk-ChZ67Jhw.js dNr replaces the zoom roles: Actual Size (id
// "actual-size", CmdOrCtrl+0) is enabled only while zoomed (uNr: level !== 0,
// kept current by DNr after each step); Zoom In is CmdOrCtrl+Plus with a
// hidden CmdOrCtrl+= twin; Zoom Out is CmdOrCtrl+-; hidden numpad twins keep
// their accelerators (acceleratorWorksWhenHidden). wNr/TNr step the level by
// lNr=.5 and SNr resets it; here each click is a {kind:"zoom"} desktop event
// that main.cjs applies (ONr/CNr, then aF moves the traffic lights).
// 2.42304.0 yPi adds id "zoom-in" (enabled:_Pi(), level below PHn=log 5/log 1.2) and id "zoom-out" (enabled:vPi(),
// level above NHn=log .25/log 1.2) to the visible Zoom In / Zoom Out; the hidden twins still have neither. Here the
// level is passed in (main.cjs: the main window's, undefined without one), so the checks are bound without a view:
// no level reads as gPi()'s void 0, i.e. enabled.
const zoomLimits = bindZoomMenu();
function zoomMenuItems({ zoomed, zoomLevel, emit }) {
  const reset = () => emit({ kind: "zoom", reset: true });
  const zoomIn = () => emit({ kind: "zoom", delta: ZOOM_STEP }), zoomOut = () => emit({ kind: "zoom", delta: -ZOOM_STEP });
  const hidden = { visible: false, acceleratorWorksWhenHidden: true };
  const level = Number.isFinite(zoomLevel) ? zoomLevel : undefined;
  return [
    { id: "actual-size", label: t("Actual Size"), accelerator: "CmdOrCtrl+0", enabled: zoomed === true, click: reset },
    { id: "zoom-in", label: t("Zoom In"), accelerator: "CmdOrCtrl+Plus", enabled: zoomLimits.canZoomIn(level), click: zoomIn },
    { label: "Zoom In (indie cooler version)", accelerator: "CmdOrCtrl+=", ...hidden, click: zoomIn },
    { id: "zoom-out", label: t("Zoom Out"), accelerator: "CmdOrCtrl+-", enabled: zoomLimits.canZoomOut(level), click: zoomOut },
    { label: "Zoom In (numpad)", accelerator: "CmdOrCtrl+numadd", ...hidden, click: zoomIn },
    { label: "Zoom Out (numpad)", accelerator: "CmdOrCtrl+numsub", ...hidden, click: zoomOut },
    { id: "actual-size-numpad", label: "Actual Size (numpad)", accelerator: "CmdOrCtrl+num0", ...hidden, enabled: zoomed === true, click: reset },
  ];
}
// 2.42304.0 I$ → PPi, run after every reset (APi) and step (FPi): one pass sets actual-size / actual-size-numpad
// (level !== 0) and zoom-in / zoom-out (_Pi / vPi) on the application menu from the main view's level. The host's main
// window stands in for the view V (same .webContents); Menu is electron's.
const refreshZoomMenu = (window, Menu) => bindZoomMenu(window, { Menu }).refreshZoomMenu();
// bNr: one gNr Show/Hide item per session pane with a local counterpart
// (Changes CmdOrCtrl+Shift+D, Files CmdOrCtrl+Shift+F, Terminal Command+J; Preview and
// Side Chat have none), labelled Hide only while the pane is enabled and open,
// enabled from the renderer's sessionPanes report, then Close Pane
// (CmdOrCtrl+\, enabled from closePane). Clicks go through RZ.
function paneMenuItems({ panes, closePane }, emit) {
  const pane = (kind, show, hide, accelerator) => {
    const { enabled, open } = panes[kind];
    return { label: enabled && open ? hide : show, accelerator, enabled, click: dispatch(emit, { kind: "toggle-pane", pane: kind }) };
  };
  // bNr's order: Terminal, Changes, Preview, Files, Side Chat, then Close Pane.
  return [
    // _Nr("Command+J"): Show/Hide Terminal (the built-in terminal pane; ⌃` toggles it too), once the renderer reports it.
    ...(panes.terminal ? [pane("terminal", t("Show Terminal"), t("Hide Terminal"), "Command+J")] : []),
    pane("changes", t("Show Changes"), t("Hide Changes"), "CmdOrCtrl+Shift+D"),
    // Show/Hide Preview, CmdOrCtrl+Shift+P (the source's Preview mode accelerator), once the renderer reports it.
    ...(panes.preview ? [pane("preview", t("Show Preview"), t("Hide Preview"), "CmdOrCtrl+Shift+P")] : []),
    pane("files", t("Show Files"), t("Hide Files"), "CmdOrCtrl+Shift+F"),
    // Show/Hide Side Chat (CmdOrCtrl+;, the /btw card), reported only where the core serves side questions.
    ...(panes.sideChat ? [pane("sideChat", t("Show Side Chat"), t("Hide Side Chat"), "CmdOrCtrl+;")] : []),
    { label: t("Close Pane"), accelerator: "CmdOrCtrl+\\", enabled: closePane.enabled, click: dispatch(emit, { kind: "close-pane" }) },
  ];
}
// pNr: _Nr opens the View submenu with the sidebar item built by gNr. On
// macOS gNr yields a plain item labelled by the current state (open ? "Hide
// Sidebar" : "Show Sidebar"); the "Sidebar" checkbox variant is
// Windows/Linux only. Its click is dispatchToggleSidebar(Menu) in the focused
// renderer, mirrored here as the {kind:"toggle-sidebar"} desktop event. The
// leading "Command Palette…" (CmdOrCtrl+K) toggles the ⌘K palette (source-sidebar-palette.jsx). Then
// bNr's pane items, yNr's Split View submenu (splitViewSubmenu), dNr zoom, Reload (fNr,
// CmdOrCtrl+R) and Enter/Exit Full Screen (Control+Command+F, xNr toggles the
// focused window). Developer tools live in the source's hidden Developer
// menu; locally Toggle Developer Tools stays in View for unpackaged builds.
function viewMenuItems({ sidebarOpen, zoomed, zoomLevel, fullScreen, allowDevTools, state, splitState, emit }) {
  return [
    { label: t("Command Palette…"), accelerator: "CmdOrCtrl+K", click: dispatch(emit, { kind: "open-search", toggle: true }) },
    { label: sidebarOpen ? t("Hide Sidebar") : t("Show Sidebar"), accelerator: "CmdOrCtrl+B", click: () => emit({ kind: "toggle-sidebar" }) },
    SEPARATOR,
    ...paneMenuItems(state, emit),
    SEPARATOR,
    splitViewSubmenu(splitMenuState(splitState), emit),
    SEPARATOR,
    ...zoomMenuItems({ zoomed, zoomLevel, emit }),
    SEPARATOR,
    { role: "reload", ...roleLabel("Reload") },
    ...(allowDevTools ? [{ role: "toggleDevTools", ...roleLabel("Toggle Developer Tools") }] : []),
    SEPARATOR,
    { label: fullScreen ? t("Exit Full Screen") : t("Enter Full Screen"), accelerator: "Control+Command+F", click: (_item, window) => emit({ kind: "toggle-full-screen" }, window) },
  ];
}
// Yxi (2.31226.0 asar index.chunk): View › Split View with Jxi's accelerators, enabled from the focused window's
// report (official reportSplitViewMenuState; src/split-view-model.mjs splitMenuState). Each click is
// {kind:"split-view", command} for that window.
function splitViewSubmenu(state, emit) {
  const item = (label, command, enabled, accelerator) => ({ label, ...(accelerator ? { accelerator } : {}), enabled: enabled === true, click: splitDispatch(emit, command) });
  return {
    label: t("Split View"),
    submenu: [
      item(t("New Session on the Right"), "new-right", state.newRight, "Control+Command+\\"),
      item(t("New Session Below"), "new-below", state.newBelow, "Control+Command+-"),
      SEPARATOR,
      item(t("Focus Next Split View"), "focus-next", state.split, "Control+]"),
      item(t("Focus Previous Split View"), "focus-previous", state.split, "Control+["),
      SEPARATOR,
      item(t("Move Split View Left"), "move-left", state.moveLeft),
      item(t("Move Split View Right"), "move-right", state.moveRight),
      item(t("Move Split View Up"), "move-up", state.moveUp),
      item(t("Move Split View Down"), "move-down", state.moveDown),
      SEPARATOR,
      item(t("Close Split View"), "close", state.split, "Control+Command+W"),
    ],
  };
}
// kNr: Minimize, Zoom, Show Main Window (KK), Bring All to Front.
function windowMenu(emit) {
  return {
    role: "window",
    label: t("Window"),
    submenu: [
      { role: "minimize", label: t("Minimize") },
      { role: "zoom", label: t("Zoom") },
      SEPARATOR,
      { label: t("Show Main Window"), click: () => emit({ kind: "show-main-window" }) },
      SEPARATOR,
      { role: "front", label: t("Bring All to Front") },
    ],
  };
}
// Djr: Keyboard Shortcuts (kjr, CmdOrCtrl+/, RZ → dispatchOpenKeyboardShortcuts)
// and Troubleshooting ▸ Show Logs in Finder (Ejr/njr). Claude Help and Get
// Support open Anthropic web resources and are omitted; so are the
// Claude-only troubleshooting rows.
function helpMenu(emit) {
  return {
    role: "help",
    label: t("Help"),
    submenu: [
      { label: t("Keyboard Shortcuts"), accelerator: "CmdOrCtrl+/", click: dispatch(emit, { kind: "open-shortcuts" }) },
      SEPARATOR,
      { label: t("Troubleshooting"), submenu: [{ label: t("Show Logs in Finder"), click: () => emit({ kind: "show-logs" }) }] },
    ],
  };
}
function appMenuTemplate({ sidebarOpen, canGoBack = false, canGoForward = false, zoomed = false, zoomLevel, fullScreen = false, allowDevTools = false, menuState: state = menuState(), splitState, newWindow = true, emit }) {
  return [
    appSubmenu(emit),
    { label: t("File"), submenu: fileMenuItems({ closePane: state.closePane.enabled, session: state.session, reopenClosed: state.reopenClosed, newWindow, emit }) },
    { label: t("Edit"), submenu: editMenuItems(emit, state.findInFiles) },
    { label: t("View"), submenu: viewMenuItems({ sidebarOpen, zoomed, zoomLevel, fullScreen, allowDevTools, state, splitState, emit }) },
    { label: t("Go"), submenu: goMenuItems({ canGoBack, canGoForward, emit }) },
    windowMenu(emit),
    helpMenu(emit),
  ];
}
// shared-2 Hm "dframe-store" persists Zm {collapsed:false, sidebarWidth:288}:
// the collapsed flag lives beside the width. Non-boolean values are ignored,
// like the width's number check in main.cjs "settings".
function sidebarCollapsedPatch(patch) {
  return typeof patch?.sidebarCollapsed === "boolean" ? { sidebarCollapsed: patch.sidebarCollapsed } : {};
}
// Renderer "navigation-state" payload (Syr's {canGoBack, canGoForward});
// anything but true reads as unavailable.
function navigationState(payload) {
  return { canGoBack: payload?.canGoBack === true, canGoForward: payload?.canGoForward === true };
}
// Renderer "menu-state" payload: the sessionPanes slice the source keeps in
// BZ ($xr zZ {enabled:false, open:false} per pane) for the panes and Close
// Pane that exist locally, session.open (a session view shows: iwr's lSr)
// and BZ.reopenClosedSession (rSr {available:false, enabled:false}, gSr);
// anything but true reads as false.
function menuState(payload) {
  const pane = (value) => ({ enabled: value?.enabled === true, open: value?.open === true });
  return { ...(payload?.findInFiles ? {findInFiles:{enabled:payload.findInFiles.enabled === true}} : {}), panes: { changes: pane(payload?.panes?.changes), files: pane(payload?.panes?.files),
    ...(payload?.panes?.terminal ? { terminal: pane(payload.panes.terminal) } : {}),
    ...(payload?.panes?.preview ? { preview: pane(payload.panes.preview) } : {}),
    ...(payload?.panes?.sideChat ? { sideChat: pane(payload.panes.sideChat) } : {}) }, closePane: { enabled: payload?.closePane?.enabled === true },
    session: { open: payload?.session?.open === true },
    reopenClosed: { available: payload?.reopenClosed?.available === true, enabled: payload?.reopenClosed?.enabled === true } };
}
// The renderer's "split-menu-state" report (split-view-model.mjs splitMenuState): anything but true is false.
function splitMenuState(payload) {
  return { newRight: payload?.newRight === true, newBelow: payload?.newBelow === true, split: payload?.split === true,
    moveLeft: payload?.moveLeft === true, moveRight: payload?.moveRight === true, moveUp: payload?.moveUp === true, moveDown: payload?.moveDown === true };
}
// vSr/_Sr: the menu is rebuilt only when a reported flag changed.
function sameMenuState(a, b) {
  return JSON.stringify(menuState(a)) === JSON.stringify(menuState(b));
}
// The main window's "close" handler (index.chunk-ChZ67Jhw.js m.on("close")):
// a quit closes it; otherwise the close is prevented and the window hides,
// leaving full screen first (leave-full-screen, then hide).
function closeAction({ quitting, fullScreen }) {
  if (quitting) return "close";
  return fullScreen ? "leave-full-screen" : "hide";
}
// app "activate" (Dock click): recreate a destroyed main window; restore a
// minimized one only when no window is visible; show a hidden one.
function activateAction({ exists, minimized, visible, hasVisibleWindows }) {
  if (!exists) return "create";
  if (minimized) return hasVisibleWindows ? null : "restore";
  return visible ? null : "show";
}
module.exports = { appMenuTemplate, zoomMenuItems, refreshZoomMenu, goMenuItems, sidebarCollapsedPatch, navigationState, menuState, sameMenuState,
  closeAction, activateAction, rendererOwned, splitMenuState };
