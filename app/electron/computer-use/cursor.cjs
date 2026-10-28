// The phantom cursor (official 2.42304.0 §2.6): while a session controls a window in the background (an app lock: a
// window it took an app_screenshot of and has not app_release'd), a clay arrow sits on that window at the point of the
// last app_* action. Clicks go through Accessibility, so nothing moves the real pointer; this only shows the user where
// it happened.
//
// Native (the default in the app): computer_use.node setPhantomCursor(screenX, screenY, windowId?, pulse?) /
// hidePhantomCursor(windowId?) — one non-activating NSPanel per window, stacked directly above it (PhantomCursor.swift).
// The panels are AppKit windows created on the main thread; a process without a Cocoa main run loop
// (ELECTRON_RUN_AS_NODE) answers main_thread_unavailable, and the native module may be missing: then the web pointer
// below is used for the rest of the process.
//
// Web fallback: a small transparent, click-through, screen-saver-level panel window (as glow.cjs's) with an arrow
// pointer, moved to the point, shown without taking focus, faded out FADE_AFTER_MS later. One for all windows.
//
// The service's hooks (service.cjs `pointer`): beforeClick({windowId}) before every hit-tested app_* action — the
// window's cursor goes (awaited), it must never be what an Accessibility hit test finds —, clicked(point) after a click
// (pulse), moved(point) after any other action that landed and when a window is locked (its centre), restore({windowId})
// after an action that did not land, released({windowId}) when the lock goes. Display-scope (beforeClick({scope:
// "display"})) moves the real pointer and never uses the phantom cursor (official): native panels stay as they are —
// click-through, and out of the display hit test by windowNumbers() — while the web pointer hides.
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

// A native answer that means "no native cursor in this process": use the web pointer from then on.
const NATIVE_UNAVAILABLE = new Set(["native_unavailable", "main_thread_unavailable", "unknown_method"]);

/**
 * @param {{BrowserWindow: Function, app?: object, native?: {call: Function, available?: Function}, platform?: string,
 *   log?: object, setTimer?: Function, clearTimer?: Function}} options
 */
function createCursor({ BrowserWindow, app, native = null, platform = process.platform, log = console, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const web = createWebCursor({ BrowserWindow, app, platform, log, setTimer, clearTimer });
  let mode = native && platform === "darwin" && (typeof native.available !== "function" || native.available()) ? "native" : "web";
  const tips = new Map();          // windowId (0: none) → {x, y}: where its cursor is, while it is wanted
  // windowId → the panel's CGWindowID (windowNumber), while wanted: also while ordered out behind an off-screen window,
  // since the native restack orders it back in (Space switch, un-minimize) without a call that could tell us.
  const shown = new Map();
  let chain = Promise.resolve();   // native calls in order: a hide must land before the hit test that follows it
  const key = (windowId) => (Number.isInteger(windowId) && windowId > 0 ? windowId : 0);
  const fellBack = (error) => {
    if (!NATIVE_UNAVAILABLE.has(error?.code)) return false;
    mode = "web";
    shown.clear();
    log.info?.(`[cu-cursor] native phantom cursor unavailable (${error.code}); using the web pointer`);
    return true;
  };
  /** One native call after the ones before it; on "unavailable" the web version runs instead. */
  const queue = (nativeOp, webOp) => {
    // The web pointer acts at once (its hide is synchronous, as before the native cursor).
    if (mode !== "native") { try { return Promise.resolve(webOp()); } catch (error) { return Promise.reject(error); } }
    const run = chain.then(async () => {
      if (mode !== "native") return webOp();
      try { return await nativeOp(); } catch (error) {
        if (fellBack(error)) return webOp();
        log.warn?.("[cu-cursor] native cursor failed", error?.code ?? error);
        return undefined;
      }
    });
    chain = run.catch(() => undefined);
    return run;
  };
  const record = (windowId, state) => {
    if (Number.isInteger(state?.windowNumber) && state.windowNumber > 0) shown.set(windowId, state.windowNumber);
    else shown.delete(windowId);
    return state;
  };

  /**
   * Show the window's cursor with its tip at a global screen point (top-left origin). pulse: the click pulse (official:
   * only clicks). Without windowId: one floating cursor (native) / the web pointer.
   */
  function pointAt({ x, y, windowId, pulse = true } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return Promise.resolve();
    const id = key(windowId);
    tips.set(id, { x, y });
    return queue(async () => {
      const state = await native.call("setPhantomCursor", { screenX: x, screenY: y, ...(id ? { windowId: id } : {}), pulse: pulse === true });
      record(id, state);
    }, () => web.pointAt({ x, y, pulse }));
  }

  /**
   * Gone at once: that window's cursor, or every one (no windowId). Resolves once it is off screen. release: the native
   * panel is closed and forgotten too (the lock went), not kept for the next action.
   */
  function hideNow(windowId, { release = false } = {}) {
    const ids = windowId === undefined || windowId === null ? null : [key(windowId)];
    const extra = release ? { release: true } : {};
    return queue(async () => {
      if (!ids) { await native.call("hidePhantomCursor", { ...extra }); shown.clear(); return; }
      for (const id of ids) { await native.call("hidePhantomCursor", { windowId: id, ...extra }); shown.delete(id); }
    }, () => web.hideNow());
  }

  return {
    pointAt, hideNow,
    /** The service's hook before an action: a window's cursor out of its hit test; display-scope leaves native ones. */
    beforeClick(target = {}) {
      if (target?.scope === "display") return mode === "native" ? Promise.resolve() : web.hideNow();
      return hideNow(target?.windowId);
    },
    /** Back where it was (an action that hid it and did not land). */
    restore({ windowId } = {}) {
      const tip = tips.get(key(windowId));
      return tip ? pointAt({ ...tip, windowId, pulse: false }) : Promise.resolve();
    },
    /** The window's lock went: hide it and forget where it was. */
    release({ windowId } = {}) {
      tips.delete(key(windowId));
      return hideNow(key(windowId), { release: true });
    },
    mode: () => mode,
    isShown: () => (mode === "native" ? shown.size > 0 : web.isShown()),
    /** The native panels' CGWindowIDs that are wanted, on screen or about to be (the display hit test skips them). */
    windowNumbers: () => [...shown.values()],
    owns: (candidate) => web.owns(candidate),
    /** Native state, for the live check: {cursors: [...]}; null without the native cursor. */
    state: () => (mode === "native" ? queue(() => native.call("phantomCursorState"), () => null) : Promise.resolve(null)),
    dispose() {
      tips.clear();
      if (mode === "native") queue(() => native.call("hidePhantomCursor", { release: true }), () => undefined).catch(() => undefined);
      shown.clear();
      web.dispose();
    },
  };
}

/** The web approximation (the fallback): one pointer window for all, faded out after a while. */
function createWebCursor({ BrowserWindow, app, platform = process.platform, log = console, setTimer = setTimeout, clearTimer = clearTimeout }) {
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

  /** Show the pointer with its tip at a global screen point (top-left origin), then fade it out. pulse: the ring. */
  function pointAt({ x, y, pulse = true }) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return Promise.resolve();
    clearTimers();
    const current = ++generation;
    return ensureWindow().then((target) => {
      if (current !== generation || target.isDestroyed()) return;
      target.setBounds({ x: Math.round(x - TIP.x), y: Math.round(y - TIP.y), width: SIZE, height: SIZE });
      if (!target.isVisible()) target.showInactive();
      page(target, `(() => { const p = document.getElementById("pointer"); p.classList.remove("click"); p.style.opacity = "1"; void p.offsetWidth; ${pulse ? 'p.classList.add("click"); ' : ""}})()`);
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
    return Promise.resolve();
  }

  return {
    pointAt, hideNow,
    isShown: () => !!window && !window.isDestroyed() && window.isVisible(),
    owns: (candidate) => !!window && candidate === window,
    dispose() { clearTimers(); ++generation; if (window && !window.isDestroyed()) window.destroy(); window = null; },
  };
}

module.exports = { createCursor, createWebCursor, NATIVE_UNAVAILABLE, POINTER_PAGE, FADE_AFTER_MS, FADE_MS, SIZE, TIP };
