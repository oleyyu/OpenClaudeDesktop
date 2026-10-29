// Full control docks the main window as a side panel (official 2.42304.0 [cu-side-panel], asar
// index.chunk-muI2IV6k.js @6423900–6425800, 3.6556.2 jPKPzV-P TPa…IPa / Fnr; spec §2.5.2). When a session takes the display lock the window leaves full
// screen / un-maximizes, remembers its bounds and minimum size, and shrinks to min(520, work-area width - 20) ×
// min(720, work-area height - 20) in the top-right corner of the work area of the display its centre is on (20 px from
// the right and top edges); it floats above other windows and on every Space, full-screen ones included. When the lock
// goes, the app takes focus and the window goes back: bounds, minimum size, maximized, full screen.
//
//   DFa / OFa / kFa / AFa   PANEL_WIDTH / PANEL_HEIGHT / PANEL_MARGIN / ANIMATE_MS
//   NFa                     dockedBounds
//   MFa                     moveTo: macOS setBounds(animate), elsewhere a 220 ms ease-in-out-cubic of its own
//   PFa                     float: setAlwaysOnTop(true, "floating") + setVisibleOnAllWorkspaces(visibleOnFullScreen)
//   FFa / IFa               dock (save the window's state once, then shrink and float)
//   LFa                     restore
//   RFa                     lockChanged (the official cuLockChanged listener) with the window to dock
//   tR                      dispatch(window, docked, holder): CuDockStateChanged — the renderer lays itself out as a
//                           narrow window (sidebar folded, extra panes parked) while docked
//   o5                      generation: a later dock or restore wins over one still animating
//   a5                      saved: {window, bounds, minSize, wasFullScreen, wasMaximized}
//   xFa                     hiddenByTeach(window): a teach step hid the window; docking doesn't bring it back
//
// One difference: the official app has one main window (RFa takes it once). Here the caller names the window at each
// lock change (main.cjs computerUseDockWindow: the full window showing the holder, else the one focused last); while a
// window is docked it stays the docked one until the lock goes, so a second window is never docked over the first.
const PANEL_WIDTH = 520;
const PANEL_HEIGHT = 720;
const PANEL_MARGIN = 20;
const ANIMATE_MS = 220;

/** NFa: the panel's bounds in the work area of the display nearest the window's centre. */
function dockedBounds(window, screen) {
  const bounds = window.getBounds();
  const area = screen.getDisplayNearestPoint({ x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) }).workArea;
  const width = Math.min(PANEL_WIDTH, area.width - PANEL_MARGIN);
  return { width, height: Math.min(PANEL_HEIGHT, area.height - PANEL_MARGIN), x: Math.round(area.x + area.width - width - PANEL_MARGIN), y: Math.round(area.y + PANEL_MARGIN) };
}

const sameBounds = (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
const easeInOutCubic = (s) => (s < 0.5 ? 4 * s * s * s : 1 - (-2 * s + 2) ** 3 / 2);

/**
 * @param {{screen: object, app?: object, platform?: string, log?: object, dispatch?: Function,
 *   hiddenByTeach?: (window: object) => boolean, focus?: (window: object) => void, now?: () => number,
 *   setTimer?: Function}} options
 * dispatch(window, docked, holder) tells the window's renderer (official tR → dispatchCuDockStateChanged). focus(window)
 * is LFa's `app.focus({steal: true}); window.focus()` (replaceable for tests that must not take focus).
 */
function createSidePanel({ screen, app = null, platform = process.platform, log = console, dispatch = () => {}, hiddenByTeach = () => false,
  focus = (window) => { try { app?.focus?.({ steal: true }); } catch {} window.focus(); },
  now = () => performance.now(), setTimer = setTimeout } = {}) {
  let generation = 0;
  let saved = null;
  let docked = null;   // the window floated as the panel (official YXi(id, true)), until it is restored
  const tell = (window, on, holder) => {
    try { if (window && !window.isDestroyed()) dispatch(window, on, on ? holder ?? null : null); } catch (error) { log.warn?.("[cu-side-panel] dispatch failed", error); }
  };

  /** MFa. */
  async function moveTo(window, target, run) {
    if (window.isDestroyed()) return;
    if (platform === "darwin") {
      try { window.setBounds(target, true); } catch { window.setBounds(target); }
      return;
    }
    const from = window.getBounds();
    if (sameBounds(from, target)) return;
    const start = now();
    await new Promise((resolve) => {
      const step = () => {
        if (window.isDestroyed() || window.isMinimized() || generation !== run) { resolve(); return; }
        const s = Math.min(1, (now() - start) / ANIMATE_MS), e = easeInOutCubic(s);
        try {
          window.setBounds({ x: Math.round(from.x + (target.x - from.x) * e), y: Math.round(from.y + (target.y - from.y) * e),
            width: Math.round(from.width + (target.width - from.width) * e), height: Math.round(from.height + (target.height - from.height) * e) });
        } catch {}
        if (s < 1) setTimer(step, 8); else resolve();
      };
      setTimer(step, 0);
    });
  }
  /** PFa. */
  function float(window, on) {
    docked = on ? window : (docked === window ? null : docked);
    if (platform === "darwin") {
      if (on) {
        window.setAlwaysOnTop(true, "floating");
        window.setVisibleOnAllWorkspaces(true, { skipTransformProcessType: true, visibleOnFullScreen: true });
      } else {
        window.setAlwaysOnTop(false);
        window.setVisibleOnAllWorkspaces(false, { skipTransformProcessType: true });
      }
    } else window.setAlwaysOnTop(on, on ? "screen-saver" : undefined);
  }
  /** IFa. */
  async function shrink(window, run, minSize) {
    if (!window.isVisible() && !hiddenByTeach(window)) window.showInactive();
    const target = dockedBounds(window, screen);
    window.setMinimumSize(Math.min(minSize[0], target.width), Math.min(minSize[1], target.height));
    await moveTo(window, target, run);
    if (generation !== run || window.isDestroyed()) return;
    float(window, true);
    log.info?.("[cu-side-panel] docked");
  }
  /** FFa. */
  async function dock(window, holder) {
    const run = ++generation;
    tell(window, true, holder);
    if (saved) { await shrink(window, run, saved.minSize); return; }
    const wasFullScreen = window.isFullScreen(), wasMaximized = window.isMaximized();
    if (window.isAlwaysOnTop()) log.info?.("[cu-side-panel] main window was already always-on-top before docking");
    const minSize = window.getMinimumSize();
    if (wasFullScreen) {
      await new Promise((resolve) => { window.once("leave-full-screen", () => resolve()); window.setFullScreen(false); });
      if (window.isDestroyed()) return;
      if (generation !== run) { window.setFullScreen(true); return; }
    }
    if (wasMaximized) window.unmaximize();
    saved = { window, bounds: window.getBounds(), minSize, wasFullScreen, wasMaximized };
    await shrink(window, run, minSize);
  }
  /** LFa. */
  async function restore(window) {
    const run = ++generation;
    const state = saved;
    if (!state) { tell(window, false); return; }
    focus(window);
    await moveTo(window, state.bounds, run);
    if (generation !== run || window.isDestroyed()) return;
    saved = null;
    window.setMinimumSize(state.minSize[0], state.minSize[1]);
    float(window, false);
    tell(window, false);
    if (state.wasMaximized) window.maximize();
    if (state.wasFullScreen) window.setFullScreen(true);
    log.info?.("[cu-side-panel] restored");
  }

  return {
    /**
     * The display lock's holder changed (official RFa's cuLockChanged listener): a holder docks `window` (or keeps the
     * window already docked), none restores it. Resolves when the move is done or superseded.
     */
    async lockChanged(holder, { window = null } = {}) {
      // A window that went away while docked takes its saved state with it (official RFa drops a5 for a new window).
      if (saved && saved.window.isDestroyed()) { saved = null; docked = null; }
      const target = saved?.window ?? (window && !window.isDestroyed() ? window : null);
      if (!target) return;
      try {
        if (holder) await dock(target, holder); else await restore(target);
      } catch (error) { log.warn?.("[cu-side-panel] failed", error); }
    },
    /** The window floated as the panel right now (official XXi(id) === true), or null. */
    dockedWindow: () => (docked && !docked.isDestroyed() ? docked : null),
    /** The window being docked or docked (its own state saved), until it is restored. */
    window: () => (saved && !saved.window.isDestroyed() ? saved.window : null),
  };
}

module.exports = { createSidePanel, dockedBounds, PANEL_WIDTH, PANEL_HEIGHT, PANEL_MARGIN, ANIMATE_MS };
