// The target window highlight: while a session works in the background on an app's window (app_* tools), that window
// carries the clay rim of the screen glow on its own frame; the screen-wide glow (glow.cjs) is full-screen control's,
// the display lock's (official §2.5.2). Native: computer_use.node showWindowHighlight(windowId, reduceMotion?) /
// hideWindowHighlight(windowId?) — one non-activating, click-through NSPanel per window, stacked directly above it,
// following it as it moves, resizes, changes Space or is minimized (WindowHighlight.swift).
//
// 2.42304.0 has no window highlight (docs/computer-use-official-spec-20261021.md §2.6.3): its phantom cursor is what
// sits on the target window. This one is made of official parts only: the glow page's rim and pulse, the phantom
// cursor's panel and stacking. There is no web fallback: a BrowserWindow cannot be ordered relative to another app's
// window, so without the native panels (native_unavailable, main_thread_unavailable, unknown_method) nothing is drawn.
//
// Which windows (createHighlightDriver): for every session using the computer (in-use.cjs) that does not hold the
// display lock, the window of its current app_* operation (service.cjs onTarget: an app_screenshot, or an action on a
// window it holds). It moves when the session works on another window, and goes when the session stops using the
// computer (its turn ends, it is stopped), when the window's lock goes (app_release, a revoked app, a forgotten
// session) or when the session takes full-screen control (the display glow then shows instead).
const { NATIVE_UNAVAILABLE } = require("./cursor.cjs");

/**
 * @param {{native?: {call: Function, available?: Function} | null, reduceMotion?: () => boolean, platform?: string,
 *   log?: object}} options
 */
function createWindowHighlight({ native = null, reduceMotion = () => false, platform = process.platform, log = console } = {}) {
  let mode = native && platform === "darwin" && (typeof native.available !== "function" || native.available()) ? "native" : "off";
  const wanted = new Set();       // windowIds shown and not hidden since
  const numbers = new Map();      // windowId → the panel's CGWindowID, once known
  let chain = Promise.resolve();  // native calls in order: a hide never overtakes the show before it
  const queue = (run, fallback) => {
    const next = chain.then(() => (mode === "native" ? run() : fallback())).catch((error) => {
      if (NATIVE_UNAVAILABLE.has(error?.code)) {
        mode = "off";
        wanted.clear(); numbers.clear();
        log.info?.(`[cu-highlight] native window highlight unavailable (${error.code}); no highlight in this process`);
      } else {
        log.warn?.("[cu-highlight]", error?.code ?? "", error?.message ?? error);
      }
      return fallback();
    });
    chain = next.catch(() => undefined);
    return next;
  };
  const valid = (windowId) => Number.isInteger(windowId) && windowId > 0;
  return {
    /** The rim on a window, following it. */
    show(windowId) {
      if (!valid(windowId) || mode !== "native") return Promise.resolve(null);
      wanted.add(windowId);
      return queue(async () => {
        const state = await native.call("showWindowHighlight", { windowId, reduceMotion: reduceMotion() === true });
        if (Number.isInteger(state?.windowNumber) && state.windowNumber > 0) numbers.set(windowId, state.windowNumber);
        return state;
      }, () => null);
    },
    /** That window's highlight fades out; no window id: every highlight. */
    hide(windowId) {
      if (windowId !== undefined && !valid(windowId)) return Promise.resolve(null);
      if (windowId === undefined) wanted.clear(); else wanted.delete(windowId);
      if (mode !== "native") return Promise.resolve(null);
      return queue(() => native.call("hideWindowHighlight", windowId === undefined ? {} : { windowId }), () => null);
    },
    /** The app's Reduce motion setting changed: the highlights up now follow it. */
    refreshMotion() {
      for (const windowId of [...wanted]) void this.show(windowId);
    },
    /** The windows highlighted now. */
    windows: () => [...wanted],
    /** The panels' CGWindowIDs of the highlights up now (the display hit test skips them). */
    windowNumbers: () => [...wanted].map((windowId) => numbers.get(windowId)).filter((id) => Number.isInteger(id)),
    mode: () => mode,
    /** Native state, for the live check: {highlights: [...]}; null without the native highlight. */
    state: () => (mode === "native" ? queue(() => native.call("windowHighlightState"), () => null) : Promise.resolve(null)),
    dispose() {
      if (mode === "native" && wanted.size) void queue(() => native.call("hideWindowHighlight", {}), () => null);
      wanted.clear();
    },
  };
}

/**
 * Which windows are highlighted. highlight: createWindowHighlight's {show, hide, windows};
 * inUse: {sessions(), onChange(fn)} (in-use.cjs); holder: () => the display lock's holder (full-control.cjs) or null.
 */
function createHighlightDriver({ highlight, inUse, holder = () => null }) {
  const targets = new Map();  // sessionId → windowId: the window of its current app_* operation
  function sync() {
    const using = new Set(inUse.sessions());
    const lock = holder();
    const want = new Set();
    for (const [sessionId, windowId] of targets) if (using.has(sessionId) && sessionId !== lock) want.add(windowId);
    const now = new Set(highlight.windows());
    for (const windowId of now) if (!want.has(windowId)) void highlight.hide(windowId);
    for (const windowId of want) if (!now.has(windowId)) void highlight.show(windowId);
  }
  const unsubscribe = inUse.onChange(() => sync());
  return {
    /** service.cjs onTarget: the session now works on this window. */
    target({ sessionId, windowId } = {}) {
      if (typeof sessionId !== "string" || !sessionId || !Number.isInteger(windowId) || windowId <= 0) return;
      if (targets.get(sessionId) === windowId) return;
      targets.set(sessionId, windowId);
      sync();
    },
    /**
     * service.cjs: a session's lock on this window went (app_release, a revoked app, a forgotten session); no sessionId:
     * every session's.
     */
    released({ sessionId, windowId } = {}) {
      let changed = false;
      for (const [id, held] of [...targets]) {
        if (held === windowId && (sessionId === undefined || id === sessionId)) { targets.delete(id); changed = true; }
      }
      if (changed) sync();
    },
    /** A session is gone: its target with it. */
    forget(sessionId) { if (targets.delete(sessionId)) sync(); },
    /** The display lock changed hands (the holder's window highlight gives way to the display glow). */
    lockChanged: () => sync(),
    targets: () => new Map(targets),
    dispose() { try { unsubscribe?.(); } catch {} targets.clear(); },
  };
}

module.exports = { createWindowHighlight, createHighlightDriver };
