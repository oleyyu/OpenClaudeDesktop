// The pointer that shows where computer use last clicked. The original draws a native NSPanel; this is a web
// approximation of it: a small transparent, click-through, screen-saver-level panel window (as glow.cjs's) with an arrow
// pointer, moved to the click's screen point, shown without taking focus, faded out FADE_AFTER_MS later.
// Clicks go through Accessibility, so nothing moves the real pointer; this only shows the user where it happened.
//
// hideNow() is called before every click (service.cjs beforeClick): Accessibility hit-tests the screen point, and the
// pointer must never be the window under it. The app is never granted, so captures never include it either.
const SIZE = 40;          // window edge, points; the arrow's tip sits at TIP inside it
const TIP = { x: 8, y: 6 };
const FADE_AFTER_MS = 2000;
const FADE_MS = 300;

// Arrow and a clay ring at the tip (the glow's rgb(217, 119, 87)); the page fades #pointer through opacity.
const POINTER_PAGE = `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }
  #pointer { position: fixed; inset: 0; opacity: 0; transition: opacity ${FADE_MS / 1000}s ease-in-out; pointer-events: none; }
  #ring { position: absolute; left: ${TIP.x - 7}px; top: ${TIP.y - 7}px; width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(217, 119, 87, 0.9); box-sizing: border-box; }
  #pointer.click #ring { animation: ring 0.6s ease-out 1; }
  @keyframes ring { 0% { transform: scale(0.4); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { #pointer.click #ring { animation: none; } }
  svg { position: absolute; left: ${TIP.x - 1}px; top: ${TIP.y - 1}px; filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.35)); }
</style></head>
<body><div id="pointer"><div id="ring"></div>
<svg width="18" height="26" viewBox="0 0 18 26" aria-hidden="true"><path d="M1 1 L1 20 L5.6 15.6 L9 23.5 L12.2 22.1 L8.9 14.4 L15 14.4 Z"
  fill="#000" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></div></body></html>`;

/**
 * @param {{BrowserWindow: Function, app?: object, platform?: string, log?: object, setTimer?: Function, clearTimer?: Function}} options
 */
function createCursor({ BrowserWindow, app, platform = process.platform, log = console, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let window = null, creating = null, fadeTimer = null, hideTimer = null, generation = 0;
  const clearTimers = () => {
    if (fadeTimer) { clearTimer(fadeTimer); fadeTimer = null; }
    if (hideTimer) { clearTimer(hideTimer); hideTimer = null; }
  };

  function ensureWindow() {
    if (window && !window.isDestroyed()) return Promise.resolve(window);
    if (creating) return creating;
    const created = new BrowserWindow({ width: SIZE, height: SIZE, transparent: true, frame: false, roundedCorners: false, hasShadow: false,
      alwaysOnTop: true, skipTaskbar: true, focusable: false, movable: false, resizable: false, minimizable: false, maximizable: false,
      fullscreenable: false, type: platform === "darwin" ? "panel" : undefined, show: false, backgroundColor: "#00000000",
      webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } });
    created.setAlwaysOnTop(true, "screen-saver");
    created.setIgnoreMouseEvents(true);
    if (platform === "darwin") {
      created.setHiddenInMissionControl?.(true);
      created.setVisibleOnAllWorkspaces?.(true, { visibleOnFullScreen: true });
      if (app?.dock && !app.dock.isVisible()) app.dock.show();
    }
    created.on("closed", () => { if (window === created) window = null; });
    creating = created.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(POINTER_PAGE)}`).then(() => {
      window = created;
      return created;
    }).catch((error) => {
      if (!created.isDestroyed()) created.destroy();
      throw error;
    }).finally(() => { creating = null; });
    return creating;
  }
  const page = (target, script) => target.webContents.executeJavaScript(script).catch(() => undefined);

  /** Show the pointer with its tip at a global screen point (top-left origin), then fade it out. */
  function pointAt({ x, y }) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return Promise.resolve();
    clearTimers();
    const current = ++generation;
    return ensureWindow().then((target) => {
      if (current !== generation || target.isDestroyed()) return;
      target.setBounds({ x: Math.round(x - TIP.x), y: Math.round(y - TIP.y), width: SIZE, height: SIZE });
      if (!target.isVisible()) target.showInactive();
      page(target, `(() => { const p = document.getElementById("pointer"); p.classList.remove("click"); p.style.opacity = "1"; void p.offsetWidth; p.classList.add("click"); })()`);
      fadeTimer = setTimer(() => {
        fadeTimer = null;
        page(target, 'document.getElementById("pointer").style.opacity = "0"');
        hideTimer = setTimer(() => { hideTimer = null; if (current === generation && !target.isDestroyed()) target.hide(); }, FADE_MS);
      }, FADE_AFTER_MS);
    }).catch((error) => { log.warn?.("[cu-cursor] show failed", error); });
  }

  /** Gone at once (before a click's hit test, or when the session stops using the computer). */
  function hideNow() {
    ++generation;
    clearTimers();
    if (window && !window.isDestroyed() && window.isVisible()) {
      page(window, 'document.getElementById("pointer").style.opacity = "0"');
      window.hide();
    }
  }

  return {
    pointAt, hideNow,
    isShown: () => !!window && !window.isDestroyed() && window.isVisible(),
    owns: (candidate) => !!window && candidate === window,
    dispose() { clearTimers(); ++generation; if (window && !window.isDestroyed()) window.destroy(); window = null; },
  };
}

module.exports = { createCursor, POINTER_PAGE, FADE_AFTER_MS, FADE_MS, SIZE, TIP };
