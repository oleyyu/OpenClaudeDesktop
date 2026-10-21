// The screen glow while a session uses the computer (docs/computer-use-glow-design-20261020.md): the 2.42304.0 original
// (asar index.chunk-muI2IV6k.js, log tag [cu-glow]) — fIr creates the window, pIr shows, mIr hides, dIr moves it to a
// display. A transparent, click-through, screen-saver-level panel over one display that loads the original page
// (glow-page.cjs) from tmpdir/cu-glow.html. It is created on the first show and kept: a hide fades #overlay out (its
// .3s transition) and hides the window HIDE_MS later. Every show and hide takes a new generation, so a show that is
// still creating the window does nothing once a later hide (or show) has come.
//
// Two local additions the original lacks (design doc §4.4, §4.5; user's call 2026-10-20): the app's own Reduce motion
// setting (reduceMotion()) turns the page's animations off as its prefers-reduced-motion rule does, through a style the
// page gets at run time (the page itself stays the original); and a display that goes away or changes size moves the
// glow (back to the primary display when its own is gone).
//
// The original follows the full control lock's holder, and so does this one (main.cjs computerUseSyncGlow: up while the
// display lock's holder is using the computer — design doc §3 A, since the lock exists); background app_* work shows
// only the phantom cursor (official §2.6; the window highlight is not wired). The window is
// the app's own: owns(window) keeps it out of the app's window-wide handling (theme backgrounds, the quit guard), as the
// original's uPr does, and screen captures leave it out because they include only granted apps (Capture.swift).
const nodePath = require("node:path");
const { GLOW_PAGE, DEFAULT_LABEL } = require("./glow-page.cjs");

// $Fr: the fade-out (.3s) plus a little, then the window hides.
const HIDE_MS = 320;

// The page's own reduced-motion rule, for the app setting.
const REDUCE_MOTION_RULE = "#glow, #badge-dot, #badge.flash { animation: none; }";
const motionScript = (reduce) => `(() => {
  let style = document.getElementById("app-reduce-motion");
  if (${reduce ? "true" : "false"}) {
    if (!style) { style = document.createElement("style"); style.id = "app-reduce-motion"; document.head.appendChild(style); }
    style.textContent = ${JSON.stringify(REDUCE_MOTION_RULE)};
  } else if (style) style.remove();
})()`;

/**
 * @param {{BrowserWindow: Function, screen: object, app?: object, fs: {writeFile: Function, unlink: Function},
 *   tmpdir: () => string, reduceMotion?: () => boolean, platform?: string, log?: object, setTimer?: Function,
 *   clearTimer?: Function}} options
 */
function createGlow({ BrowserWindow, screen, app, fs, tmpdir, reduceMotion = () => false, platform = process.platform, log = console,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  let window = null, pagePath = null, hideTimer = null, generation = 0, displayId = null, shown = false;
  const listeners = new Set();
  // HG: tell the listeners whether the glow is up (only on a change).
  const setShown = (value) => {
    if (value === shown) return;
    shown = value;
    for (const listener of [...listeners]) { try { listener(shown); } catch {} }
  };
  // NTr: the chosen display, else the primary one.
  const display = () => (displayId === null ? null : screen.getAllDisplays().find((d) => d.id === displayId)) ?? screen.getPrimaryDisplay();

  async function ensureWindow() {
    if (window && !window.isDestroyed()) return window;
    const file = nodePath.join(tmpdir(), "cu-glow.html");
    await fs.writeFile(file, GLOW_PAGE);
    pagePath = file;
    const { bounds } = display();
    const created = new BrowserWindow({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, transparent: true, frame: false,
      roundedCorners: false, hasShadow: false, alwaysOnTop: true, skipTaskbar: true, focusable: false, movable: false, resizable: false,
      minimizable: false, maximizable: false, fullscreenable: false, type: platform === "darwin" ? "panel" : undefined,
      enableLargerThanScreen: true, show: false, backgroundColor: "#00000000",
      webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } });
    window = created;
    created.setAlwaysOnTop(true, "screen-saver");
    created.setFullScreenable(false);
    created.setIgnoreMouseEvents(true);
    if (platform === "darwin") {
      created.setHiddenInMissionControl(true);
      // IO: a panel window can take the Dock icon away; bring it back.
      if (app?.dock && !app.dock.isVisible()) app.dock.show();
    }
    created.on("closed", () => {
      if (window === created) window = null;
      if (pagePath) { fs.unlink(pagePath).catch(() => undefined); pagePath = null; }
      setShown(false);
    });
    try {
      await created.loadFile(file);
    } catch (error) {
      if (!created.isDestroyed()) created.destroy();
      if (window === created) window = null;
      throw error;
    }
    log.info?.(`[cu-glow] window created requested=${JSON.stringify(bounds)} actual=${JSON.stringify(created.getBounds())}`);
    return created;
  }

  /** pIr: show the glow on the chosen display; the badge flashes from the center to the corner. */
  function show({ label = DEFAULT_LABEL, showBadge = true } = {}) {
    if (hideTimer) { clearTimer(hideTimer); hideTimer = null; }
    const current = ++generation;
    setShown(true);
    return (async () => {
      let target;
      try {
        target = await ensureWindow();
      } catch (error) {
        if (!window) setShown(false);
        throw error;
      }
      if (current !== generation || target.isDestroyed()) return;
      target.setBounds(display().bounds);
      if (!target.isVisible()) target.showInactive();
      target.webContents.executeJavaScript(motionScript(reduceMotion())).catch(() => undefined);
      target.webContents.executeJavaScript(`(() => {
          const badge = document.getElementById("badge");
          document.getElementById("badge-label").textContent = ${JSON.stringify(label)};
          badge.classList.remove("flash");
          document.getElementById("overlay").style.opacity = "1";
          ${showBadge ? 'void badge.offsetWidth; badge.classList.add("flash");' : ""}
        })()`).catch(() => undefined);
      log.info?.(`[cu-glow] shown bounds=${JSON.stringify(target.getBounds())}`);
    })().catch((error) => { log.warn?.("[cu-glow] showGlow failed", error); });
  }

  /** mIr: fade out, then hide the window (kept for the next show). */
  function hide() {
    ++generation;
    if (!window || window.isDestroyed()) { setShown(false); return; }
    if (hideTimer) return;
    window.webContents.executeJavaScript('document.getElementById("overlay").style.opacity = "0"').catch(() => undefined);
    hideTimer = setTimer(() => {
      hideTimer = null;
      if (window && !window.isDestroyed()) window.hide();
      setShown(false);
    }, HIDE_MS);
  }

  /** dIr: the display the glow covers (null: the primary display); a shown glow moves at once. */
  function moveTo(id) {
    displayId = id ?? null;
    if (window && !window.isDestroyed()) window.setBounds(display().bounds);
  }

  // A display that goes away or changes size: the glow follows (display() falls back to the primary display).
  const follow = () => { if (window && !window.isDestroyed()) window.setBounds(display().bounds); };
  const displayEvents = ["display-removed", "display-metrics-changed"];
  for (const name of displayEvents) screen.on?.(name, follow);

  return {
    show, hide, moveTo,
    /** The app's Reduce motion setting changed: a glow up now follows it at once. */
    refreshMotion() { if (window && !window.isDestroyed()) window.webContents.executeJavaScript(motionScript(reduceMotion())).catch(() => undefined); },
    isShown: () => shown,
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    /** The glow's own window: kept out of the app's window-wide handling (uPr). */
    owns: (candidate) => !!window && candidate === window,
    dispose() {
      for (const name of displayEvents) screen.removeListener?.(name, follow);
      if (hideTimer) { clearTimer(hideTimer); hideTimer = null; }
      ++generation;
      if (window && !window.isDestroyed()) window.destroy();
      window = null;
    },
  };
}

module.exports = { createGlow, HIDE_MS };
