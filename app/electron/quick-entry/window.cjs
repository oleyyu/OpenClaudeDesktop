// Quick Entry's window (official main index.chunk-Du-Wqi0E.js, module Vhi: activateQuickEntryWindow Zhi,
// requestQuickWindowDismissWithPayload ngi; 4.16336.0). What follows the original:
//   - Zhi's BrowserWindow: hidden title bar, no frame, transparent (#00000000), shadow, not resizable / minimizable /
//     maximizable / closable, skipTaskbar, hiddenInMissionControl, type "panel", always on top at "pop-up-menu", not
//     full-screenable, window.open denied; created once and kept. Height 470 (qhi); the width is the native bar's 760
//     instead of Khi = 606, because the page carries the native bar's target and send buttons (page.cjs).
//   - Toggle: a visible window is dismissed with nothing (egi(null)); a hidden one is shown at Qhi's position — the
//     saved quickWindowPosition mapped back onto its monitor, else centred in the primary work area ($hi).
//   - "hide" saves the position; "blur" dismisses with nothing.
//   - requestSkooch (Jhi = 30): a container taller or wider than the work area leaves is moved back inside it.
//   - ngi: a payload is sent when its trimmed text is longer than 2 characters; anything else only hides the window.
//     With a chatId it goes to that chat, without one to a new chat.
// Host additions: the target menu (the native bar's SwiftUI Menu: "Send to new chat", then "Recent" and up to five
// chats — QuickEntryApiRegistrar's QB = 5), as a native context menu; the target resets to a new chat on every hide.
// Not carried over: the native bar's screenshots, file attachments and dictation.
const nodePath = require("node:path");
const { pathToFileURL } = require("node:url");
const { quickEntryPage, WIDTH, HEIGHT } = require("./page.cjs");

const CHANNEL = "quick-entry:";
const SKOOCH_MARGIN = 30;
const RECENT_CHATS = 5;
const MIN_PROMPT = 3;
const PRELOAD = nodePath.join(__dirname, "preload.cjs");

// ngi: `!!e.text && e.text.trim().length > 2`.
const sendable = (text) => typeof text === "string" && text.trim().length >= MIN_PROMPT;

/** Qhi / $hi: where the window opens. `saved` is the quickWindowPosition record written on hide. */
function openPosition(saved, displays, primary, width = WIDTH, height = HEIGHT) {
  const centred = () => ({ x: (primary.workAreaSize.width - width) / 2 + primary.workArea.x, y: (primary.workAreaSize.height - height) / 2 + primary.workArea.y });
  if (!(saved && saved.absolutePointInWorkspace && saved.monitor && saved.relativePointFromMonitor)) return centred();
  let monitor = displays.find((d) => d.label === saved.monitor.label && d.bounds.width == saved.monitor.bounds?.width && d.bounds.height == saved.monitor.bounds?.height);
  if (monitor) return { x: saved.relativePointFromMonitor.x + monitor.workArea.x, y: saved.relativePointFromMonitor.y + monitor.workArea.y };
  monitor = displays.find((d) => d.label === saved.monitor.label) || primary;
  const rx = saved.relativePointFromMonitor.x / saved.monitor.workArea.width, ry = saved.relativePointFromMonitor.y / saved.monitor.workArea.height;
  return { x: monitor.workArea.x + monitor.workArea.width * rx, y: monitor.workArea.y + monitor.workArea.height * ry };
}

/** requestSkooch: the position that keeps a width × height container inside the work area, or null when it fits. */
function skoochPosition([x, y], workArea, width, height, margin = SKOOCH_MARGIN) {
  const bottom = workArea.y + workArea.height, right = workArea.x + workArea.width;
  const nextY = y + height <= bottom ? y : bottom - height - margin;
  const nextX = x + width <= right ? x : right - width - margin;
  return nextX === x && nextY === y ? null : { x: nextX, y: nextY };
}

/** The target menu's rows: Send to new chat, then Recent and the chats. */
function targetMenuTemplate({ chats, target, labels }) {
  const rows = [{ id: "new", label: labels.sendToNewChat, type: "checkbox", checked: !target }];
  if (chats.length) {
    rows.push({ type: "separator" }, { id: "recent", label: labels.recent, enabled: false });
    for (const chat of chats) rows.push({ id: `chat:${chat.chatId}`, chat, label: chat.chatName, type: "checkbox", checked: target?.chatId === chat.chatId });
  }
  return rows;
}

/**
 * @param {{BrowserWindow: any, screen: any, ipcMain: any, Menu: any, app?: any, fs: any, tmpdir: () => string,
 *   fontBase: string, t: (source: string, values?: object) => string, locale: () => string,
 *   canOpen?: () => boolean, getRecentChats: () => Array<{chatId: string, chatName: string}>,
 *   getSavedPosition: () => any, savePosition: (record: any) => void,
 *   submit: (payload: {text: string, chatId?: string}) => any, onBeforeSubmit?: () => void,
 *   preload?: string, platform?: string, log?: object, now?: () => number}} options
 */
function createQuickEntry({ BrowserWindow, screen, ipcMain, Menu, app = null, fs, tmpdir, fontBase, t, locale, canOpen = () => true,
  getRecentChats, getSavedPosition, savePosition, submit, preload = PRELOAD, platform = process.platform, log = console, now = Date.now }) {
  let window = null, ready = null, isReady = false, pagePath = null, target = null, menuOpen = false, disposed = false;
  const live = () => !!window && !window.isDestroyed();
  const mine = (event) => live() && event.sender === window.webContents;

  const labels = () => ({ newChat: t("New Chat"), sendToNewChat: t("Send to new chat"), recent: t("Recent"), send: t("Send"),
    // The native bar says "Keep chatting with Claude about..."; this app talks to other cores, so the name is left out.
    existingChatPlaceholder: t("Keep chatting about..."), untitled: t("Untitled") });
  const chats = () => {
    const untitled = t("Untitled"), seen = new Set(), rows = [];
    for (const chat of getRecentChats() || []) {
      if (!chat || typeof chat.chatId !== "string" || !chat.chatId || seen.has(chat.chatId)) continue;
      seen.add(chat.chatId);
      rows.push({ chatId: chat.chatId, chatName: typeof chat.chatName === "string" && chat.chatName.trim() ? chat.chatName.trim() : untitled });
      if (rows.length >= RECENT_CHATS) break;
    }
    return rows;
  };
  const state = () => ({ target, labels: labels() });
  const pushState = () => { if (live() && isReady) window.webContents.send(CHANNEL + "state", state()); };
  const intl = () => ({ locale: locale(), messages: { S3MXlbjkax: t("What can I help you with today?") } });

  function hide() { if (live()) window.hide(); }
  // egi / ngi.
  async function dismiss(text) {
    const chatId = target?.chatId;
    hide();
    if (!sendable(text)) return false;
    try { await submit({ text, ...(chatId ? { chatId } : {}) }); return true; }
    catch (error) { log.warn?.("[quick-entry] submit failed", error); return false; }
  }

  function openTargetMenu(anchor) {
    if (!live()) return Promise.resolve();
    const rows = targetMenuTemplate({ chats: chats(), target, labels: labels() });
    const choose = (row) => { target = row.chat ? row.chat : null; pushState(); };
    const menu = Menu.buildFromTemplate(rows.map(({ chat, ...row }) => (row.id === "new" || chat ? { ...row, click: () => choose({ chat }) } : row)));
    return new Promise((resolve) => {
      menuOpen = true;
      const done = () => { menuOpen = false; resolve(); };
      const x = Number.isFinite(anchor?.x) ? Math.round(anchor.x) : undefined, y = Number.isFinite(anchor?.y) ? Math.round(anchor.y) : undefined;
      try { menu.popup({ window, ...(x !== undefined && y !== undefined ? { x, y } : {}), callback: done }); } catch (error) { log.warn?.("[quick-entry] menu failed", error); done(); }
    });
  }

  function handle(name, fn) { ipcMain.handle(CHANNEL + name, (event, ...args) => (mine(event) ? fn(...args) : undefined)); }
  handle("requestDismiss", (text) => { void dismiss(typeof text === "string" ? text : null); });
  handle("requestSkooch", (width, height) => {
    if (!live() || !Number.isFinite(width) || !Number.isFinite(height)) return;
    const [x, y] = window.getPosition();
    const display = screen.getDisplayNearestPoint({ x, y });
    if (!display) return;
    const next = skoochPosition([x, y], display.workArea, width, height);
    if (next) window.setPosition(Math.round(next.x), Math.round(next.y));
    window.invalidateShadow?.();
  });
  handle("getInitialLocale", () => intl());
  handle("getState", () => state());
  handle("openTargetMenu", (anchor) => openTargetMenu(anchor));

  function create(position) {
    const file = nodePath.join(tmpdir(), `quick-entry-${process.pid}-${now()}.html`);
    fs.writeFileSync(file, quickEntryPage({ fontBase }));
    pagePath = file;
    const created = new BrowserWindow({ titleBarStyle: "hidden", skipTaskbar: true, x: Math.round(position.x), y: Math.round(position.y), transparent: true,
      frame: false, hiddenInMissionControl: true, backgroundColor: "#00000000", hasShadow: true, resizable: false, minimizable: false, maximizable: false,
      type: "panel", show: false, width: WIDTH, height: HEIGHT, closable: false,
      webPreferences: { preload, sandbox: true, nodeIntegration: false, contextIsolation: true } });
    window = created;
    isReady = false;
    created.setAlwaysOnTop(true, "pop-up-menu");
    created.setFullScreenable(false);
    if (platform === "darwin") {
      created.setHiddenInMissionControl?.(true);
      // A panel window can take the Dock icon away (computer-use/teach.cjs IO); bring it back.
      if (app?.dock && app.dock.isVisible && !app.dock.isVisible()) app.dock.show();
    }
    created.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    created.webContents.on("will-navigate", (event) => event.preventDefault());
    created.on("hide", () => {
      target = null;
      pushState();
      try {
        const [x, y] = created.getPosition();
        const monitor = screen.getDisplayNearestPoint({ x, y });
        savePosition({ absolutePointInWorkspace: { x, y }, monitor: { label: monitor.label, bounds: monitor.bounds, workArea: monitor.workArea },
          relativePointFromMonitor: { x: x - monitor.workArea.x, y: y - monitor.workArea.y } });
      } catch (error) { log.debug?.("[quick-entry] position not saved", error); }
    });
    created.on("closed", () => {
      if (window === created) { window = null; ready = null; isReady = false; }
      if (pagePath === file) pagePath = null;
      try { fs.unlinkSync(file); } catch {}
    });
    created.on("blur", () => { if (!menuOpen) void dismiss(null); });
    ready = new Promise((resolve) => created.once("ready-to-show", resolve)).then(() => { isReady = true; });
    Promise.resolve(created.loadFile(file)).catch((error) => log.warn?.("[quick-entry] page failed to load", error));
    return created;
  }

  /** Zhi: true when Quick Entry was shown or dismissed; false when it cannot open (the caller then shows the app). */
  async function toggle() {
    if (disposed || !canOpen()) return false;
    const position = openPosition(getSavedPosition(), screen.getAllDisplays(), screen.getPrimaryDisplay());
    if (!live()) create(position);
    if (isReady && window.isVisible()) { void dismiss(null); }
    else {
      if (!isReady) await ready;
      if (!live() || !canOpen()) return false;
      pushState();
      window.show();
      window.focus();
      window.webContents.focus();
      window.invalidateShadow?.();
    }
    if (live()) window.setPosition(Math.round(position.x), Math.round(position.y));
    return true;
  }

  // The app's language changed: the official handler re-reads its placeholder, the host its labels.
  function localeChanged() {
    if (!live() || !isReady) return;
    window.webContents.send(CHANNEL + "localeChanged", intl());
    pushState();
  }

  function dispose() {
    disposed = true;
    for (const name of ["requestDismiss", "requestSkooch", "getInitialLocale", "getState", "openTargetMenu"]) { try { ipcMain.removeHandler(CHANNEL + name); } catch {} }
    if (live()) { try { window.closable = true; } catch {} window.destroy(); }
    window = null;
  }

  return { toggle, hide, dismiss, localeChanged, dispose, openTargetMenu, visible: () => live() && window.isVisible(), window: () => (live() ? window : null) };
}

const fontBaseFor = (distDir) => pathToFileURL(nodePath.join(distDir, "assets/v1")).href + "/";

module.exports = { createQuickEntry, openPosition, skoochPosition, targetMenuTemplate, sendable, fontBaseFor, CHANNEL, RECENT_CHATS, MIN_PROMPT };
