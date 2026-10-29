// Teach mode (docs/computer-use-official-spec-20261021.md §1.3, §2.2, §2.3): Claude guides the user through a task, one
// tooltip per step, and does each step's actions when the user clicks Next. Two parts, as the 2.42304.0 original
// (asar index.chunk-muI2IV6k.js, log tag [cu-teach]; the same code in 3.6556.2 jPKPzV-P, renamed — tests/w10-cu-official-pages.test.mjs):
//
//   createTeachOverlay  the tooltip window: hFa creates it, gFa shows it, _Fa hides it (the page fades out, the window
//                       hides HIDE_MS later), vFa fades only the tooltip, yFa shows a step, bFa switches it to Working…,
//                       dFa moves it to a display. A transparent, click-through (mouse moves forwarded), screen-saver
//                       level panel over the chosen display's work area that loads the original page (teach-page.cjs)
//                       from tmpdir/cu-teach-<ts>.html with the CuTeach preload (teach-preload.cjs). It never takes focus
//                       (showInactive, focusable: false); the tooltip turns the window clickable only while the pointer
//                       is over it (mouseEnter / mouseLeave).
//   createTeachMode     the session side (the original's session manager and its EFa controller): which session is in
//                       teach mode, the step waiting for the user's Next or Exit, hiding the app's main window while a
//                       step is shown and bringing it back when the tour ends or the agent does something else.
//
// The original's EIPC channel is this build's ipcMain "cu-teach:*" (teach-preload.cjs); only the overlay's own web
// contents is answered.
const nodePath = require("node:path");
const { TEACH_PAGE } = require("./teach-page.cjs");

// iFa: the page's fade-out (300 ms) plus a little, then the window hides.
const HIDE_MS = 320;
const CHANNEL = "cu-teach:";
const PRELOAD = nodePath.join(__dirname, "teach-preload.cjs");
const METHODS = Object.freeze(["next", "exit", "mouseEnter", "mouseLeave"]);

/**
 * @param {{BrowserWindow: Function, screen: object, ipcMain?: object, app?: object, fs: {writeFile: Function, unlink: Function},
 *   tmpdir: () => string, preload?: string, platform?: string, log?: object, now?: () => number, setTimer?: Function,
 *   clearTimer?: Function, onNext?: () => void, onExit?: () => void}} options
 */
function createTeachOverlay({ BrowserWindow, screen, ipcMain = null, app = null, fs, tmpdir, preload = PRELOAD, platform = process.platform,
  log = console, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, onNext = () => {}, onExit = () => {} }) {
  let window = null, pagePath = null, hideTimer = null, pending = null, generation = 0, displayId = null;
  const live = () => (window && !window.isDestroyed() ? window : null);
  // NTr: the chosen display, else the primary one.
  const display = () => (displayId === null ? null : screen.getAllDisplays().find((d) => d.id === displayId)) ?? screen.getPrimaryDisplay();
  const send = (target, name, payload) => { try { target.webContents.send(CHANNEL + name, payload); } catch {} };
  const clickThrough = (target) => target.setIgnoreMouseEvents(true, { forward: true });

  // The page's four methods, from this window's own page only (the original EIPC checks the sender frame).
  const handlers = {
    next: () => onNext(),
    exit: () => onExit(),
    mouseEnter: () => { live()?.setIgnoreMouseEvents(false); },
    mouseLeave: () => { const target = live(); if (target) clickThrough(target); },
  };
  for (const name of METHODS) {
    ipcMain?.handle?.(CHANNEL + name, (event) => {
      const target = live();
      if (!target || event?.sender !== target.webContents || (event.senderFrame && event.senderFrame.parent !== null)) return undefined;
      try { return handlers[name](); } catch (error) { log.warn?.(`[cu-teach] ${name} failed`, error); return undefined; }
    });
  }

  /** pFa: dispatch a step; the anchor (global logical points) becomes this window's CSS pixels. */
  function dispatchShow(target, payload) {
    clickThrough(target);
    let anchor = payload.anchorLogical;
    if (anchor) { const { workArea } = display(); anchor = { x: anchor.x - workArea.x, y: anchor.y - workArea.y }; }
    send(target, "show", { explanation: payload.explanation, nextPreview: payload.nextPreview, anchorLogical: anchor });
  }

  /** hFa: create the window once (it is kept for later tours). */
  async function ensureWindow() {
    if (live()) return window;
    const file = nodePath.join(tmpdir(), `cu-teach-${now()}.html`);
    await fs.writeFile(file, TEACH_PAGE);
    pagePath = file;
    const { workArea } = display();
    const created = new BrowserWindow({ x: workArea.x, y: workArea.y, width: workArea.width, height: workArea.height, transparent: true,
      frame: false, hasShadow: false, alwaysOnTop: true, skipTaskbar: true, focusable: false, acceptFirstMouse: true, movable: false,
      resizable: false, minimizable: false, maximizable: false, fullscreenable: false, type: platform === "darwin" ? "panel" : undefined,
      show: false, backgroundColor: "#00000000",
      webPreferences: { preload, sandbox: true, nodeIntegration: false, contextIsolation: true } });
    window = created;
    created.setAlwaysOnTop(true, "screen-saver");
    created.setFullScreenable(false);
    clickThrough(created);
    if (platform === "darwin") {
      created.setHiddenInMissionControl(true);
      // IO: a panel window can take the Dock icon away; bring it back.
      if (app?.dock && !app.dock.isVisible()) app.dock.show();
    }
    created.on("closed", () => {
      if (window === created) window = null;
      if (pagePath) { fs.unlink(pagePath).catch(() => undefined); pagePath = null; }
    });
    try {
      await created.loadFile(file);
    } catch (error) {
      if (!created.isDestroyed()) created.destroy();
      if (window === created) window = null;
      throw error;
    }
    log.info?.("[cu-teach] window created");
    return created;
  }

  return {
    /** dFa: the display the overlay covers (null: the primary display); a shown overlay moves at once. */
    setDisplay(id) {
      displayId = Number.isInteger(id) ? id : null;
      live()?.setBounds(display().workArea);
    },
    displayId: () => displayId,
    /** gFa: bring the window up (created on first use) and dispatch the step waiting for it. Rejects when it can't be created. */
    show() {
      if (hideTimer) { clearTimer(hideTimer); hideTimer = null; }
      const current = ++generation;
      return (async () => {
        try {
          const target = await ensureWindow();
          if (generation !== current) { pending = null; return; }
          if (target.isDestroyed()) return;
          target.setBounds(display().workArea);
          clickThrough(target);
          if (!target.isVisible()) target.showInactive();
          if (pending) { const payload = pending; pending = null; dispatchShow(target, payload); }
        } catch (error) {
          log.warn?.("[cu-teach] showTeachOverlay failed", error);
          pending = null;
          throw error;
        }
      })();
    },
    /** _Fa: the page fades the tooltip out, the window hides HIDE_MS later. */
    hide() {
      ++generation;
      pending = null;
      const target = live();
      if (!target || hideTimer) return;
      send(target, "hide");
      hideTimer = setTimer(() => { hideTimer = null; if (live()) window.hide(); }, HIDE_MS);
    },
    /** vFa: only the tooltip fades (the agent is doing something else); the window stays. */
    fadeTooltip() {
      pending = null;
      const target = live();
      if (target?.isVisible()) send(target, "hide");
    },
    /** yFa: show a step now, or as soon as the window is up. */
    step(payload) {
      const target = live();
      if (!target || !target.isVisible()) { pending = payload; return; }
      dispatchShow(target, payload);
    },
    /** bFa: the user clicked Next; the tooltip shows Working… while the step's actions run. */
    working() {
      const target = live();
      if (!target?.isVisible()) return;
      clickThrough(target);
      send(target, "working");
    },
    /** uPr's restore: after each agent action the window is click-through again and the page re-reads the hover. */
    afterAction() {
      const target = live();
      if (!target) return;
      clickThrough(target);
      send(target, "reassertHover");
    },
    /** Before each agent action: clicks go through to the app below (the original's withClickThrough). */
    beforeAction() { const target = live(); if (target) clickThrough(target); },
    isVisible: () => !!live()?.isVisible(),
    /** The overlay's own window: kept out of the hit test and the app's window-wide handling (uPr). */
    owns: (candidate) => !!window && candidate === window,
    window: () => live(),
    dispose() {
      if (hideTimer) { clearTimer(hideTimer); hideTimer = null; }
      ++generation;
      for (const name of METHODS) { try { ipcMain?.removeHandler?.(CHANNEL + name); } catch {} }
      if (live()) window.destroy();
      window = null;
    },
  };
}

/**
 * The session side of teach mode (the original's session manager + EFa). mainWindow() is the app window to hide while
 * a step is shown; displayFor(sessionId) the session's selected display (screen-wide screenshots, switch_display);
 * displayOf(window) the display a window is on; lockHolder() the display lock's holder; stopSession(id) stops a
 * session as Esc does (its turn is interrupted).
 */
function createTeachMode({ overlay, mainWindow = () => null, displayFor = () => null, displayOf = () => null, lockHolder = () => null,
  stopSession = () => {}, log = console, now = Date.now, onChange = () => {} }) {
  const active = new Map();   // sessionId → enteredAt
  let teachSession;           // n5: the session the overlay follows
  let pendingStep = null;     // {sessionId, resolve}
  let hiddenWindow = null;    // t5 / e5: the main window this hid

  const resolveStep = (answer) => {
    const step = pendingStep;
    if (!step) return;
    pendingStep = null;
    step.resolve(answer);
  };
  /** SFa: hide the main window while the step is up. */
  function hideMain() {
    const target = mainWindow();
    if (target && !target.isDestroyed() && target.isVisible()) {
      target.hide();
      hiddenWindow = target;
    }
  }
  /** r5: bring back the window this hid. */
  function restoreMain() {
    const target = hiddenWindow;
    hiddenWindow = null;
    if (target && !target.isDestroyed() && !target.isVisible()) target.show();
  }
  const notify = (sessionId, on) => { try { onChange(sessionId, on); } catch {} };

  const api = {
    isActive: (sessionId) => active.has(sessionId),
    activeSession: () => teachSession ?? null,
    hasPendingStep: (sessionId) => pendingStep?.sessionId === sessionId,
    /** xFa: a step hid this window (the side panel's dock leaves it hidden, official IFa). */
    hidMain: (window) => !!hiddenWindow && hiddenWindow === window,
    /** onTeachModeActivated → teachModeChanged{active:true}: the overlay goes to the session's display, else the main window's. */
    activate(sessionId) {
      if (typeof sessionId !== "string" || !sessionId) return;
      active.set(sessionId, now());
      teachSession = sessionId;
      let id = displayFor(sessionId);
      if (!Number.isInteger(id)) { const target = mainWindow(); id = target && !target.isDestroyed() ? displayOf(target) : null; }
      overlay.setDisplay(id);
      notify(sessionId, true);
      log.info?.(`[cu-teach] teach mode on for ${sessionId}`);
    },
    /**
     * onTeachStep: show the step and wait for the user. Resolves {action: "next" | "exit"}. Not in teach mode → exit; a
     * new step while one waits resolves the old one as exit (as the original).
     */
    showStep(sessionId, payload) {
      return new Promise((resolve) => {
        if (!active.has(sessionId)) { log.warn?.("[cu-teach] teach_step without active teach mode — resolving as exit"); resolve({ action: "exit" }); return; }
        if (pendingStep) { log.warn?.("[cu-teach] new teach_step while one is pending — resolving old as exit"); resolveStep({ action: "exit" }); }
        pendingStep = { sessionId, resolve };
        if (sessionId !== teachSession) return;
        hideMain();
        overlay.show().catch((error) => {
          log.error?.("[cu-teach] overlay creation failed, recovering", error);
          resolveStep({ action: "exit" });
          const holder = lockHolder();
          if (holder) { try { stopSession(holder); } catch {} }
          teachSession = undefined;
          overlay.hide();
          restoreMain();
        });
        overlay.step(payload);
      });
    },
    /** onTeachWorking → teachStepWorking. */
    working(sessionId) { if (sessionId === teachSession) overlay.working(); },
    beforeAction(sessionId) { if (sessionId === teachSession) overlay.beforeAction(); },
    afterAction(sessionId) { if (sessionId === teachSession) overlay.afterAction(); },
    /** The page's Next. */
    next() { resolveStep({ action: "next" }); },
    /** TFa: the page's Exit — the step ends as exit and the lock's holder is stopped (no holder: a stale overlay is cleared). */
    exit() {
      resolveStep({ action: "exit" });
      const holder = lockHolder();
      if (holder) {
        log.info?.(`[cu-teach] exit pressed, stopping ${holder}`);
        try { stopSession(holder); } catch (error) { log.warn?.("[cu-teach] stop failed", error); }
        return;
      }
      log.warn?.("[cu-teach] exit with no lock holder — cleaning up zombie overlay");
      teachSession = undefined;
      overlay.hide();
      restoreMain();
    },
    /** A pending step of this session ends as exit (its tool call was stopped). */
    cancelStep(sessionId) { if (pendingStep?.sessionId === sessionId) resolveStep({ action: "exit" }); },
    /** teachNonTeachAction: the agent did something other than teach in teach mode — the tooltip fades, the main window returns. */
    nonTeachAction(sessionId) {
      if (sessionId !== teachSession) return;
      overlay.fadeTooltip();
      restoreMain();
    },
    /** cuSelectedDisplayChanged. */
    displayChanged(sessionId, displayId) { if (sessionId === teachSession) overlay.setDisplay(displayId); },
    /**
     * finishTurnCleanup / leavingRunning: the turn ended (or the session stopped), so teach mode ends — the waiting step
     * resolves as exit, the overlay fades away and the main window comes back. Returns how long it lasted, or null.
     */
    end(sessionId, trigger = "idle") {
      const enteredAt = active.get(sessionId);
      if (pendingStep?.sessionId === sessionId) resolveStep({ action: "exit" });
      if (enteredAt === undefined) return null;
      active.delete(sessionId);
      if (sessionId === teachSession) {
        teachSession = undefined;
        overlay.hide();
        restoreMain();
      }
      notify(sessionId, false);
      log.info?.(`[cu-teach] teach mode off for ${sessionId} (${trigger})`);
      return now() - enteredAt;
    },
  };
  return api;
}

module.exports = { createTeachOverlay, createTeachMode, HIDE_MS, CHANNEL, PRELOAD };
