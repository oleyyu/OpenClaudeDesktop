// The app's own windows let the screen-wide pointer through while it acts, and input bursts (official 2.42304.0
// executor, muI2IV6k@4016600–4019000: NG, yPr, _Pr, vPr, TPr, gPr, CPr; spec §1.1 computer_batch "输入突发").
//
// Before a click / press / release / drag / scroll on the global HID stream, every window of this app within 16 px of
// the action's points (or of the cursor) stops taking the mouse (setIgnoreMouseEvents(true)) — and then all of the
// app's windows do — so the real event reaches the app underneath even when one of ours sits next to the target or a
// drag's path crosses it. The first time a window is turned through, the action waits 50 ms for the window server to
// apply it. Afterwards each window gets its mouse back: a window registered with a restorer runs it (the teach overlay:
// click-through again plus a hover re-check), one registered as always-through (the glow, the web pointer) is left
// alone, any other gets setIgnoreMouseEvents(false).
//
// An input burst (computer_batch, teach_step / teach_batch: the pointer actions in a row) keeps the windows it turned
// through that way between its actions instead of handing the mouse back after each one, so the 50 ms settle is paid
// once per burst and the windows don't flicker. It ends when the batch reaches a non-pointer action or finishes, after
// 1 s without a pointer action (5 s while one runs), or when another burst begins; then every held window is handed back.
// The burst does not touch the gates, the back-off or the cursor: each action is still checked on its own.
//
// Safety net (official presumedHung): an action still running after 5 s is presumed hung and its windows are handed
// back anyway; while an action runs, a window it holds is not handed back by anyone else.
//
// Not taken over from the official executor: polling windowNumberAtPoint until our window is gone from the point (the
// native module has no such call; the plain 50 ms wait is the official fallback when it isn't available), and the
// Quick Entry / native-panel refusal (this build has no such native windows: the phantom cursor panels never take the
// mouse).

const SETTLE_MS = 50;          // official QNr
const IDLE_MS = 1000;          // official pPr: a burst ends this long after its last pointer action
const RUNNING_MS = 5000;       // official mPr: … this long while one runs; an action presumed hung after it
const NEAR_PX = 16;            // official SPr

const defaultNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const NOOP = () => {};

/**
 * @param {{windows: () => object[], getCursor?: () => (Promise<{x:number,y:number}>|{x:number,y:number}|null),
 *   alwaysThrough?: (window: object) => boolean, restorer?: (window: object) => (Function|undefined),
 *   now?: () => number, sleep?: (ms: number) => Promise<void>, setTimer?: Function, clearTimer?: Function, log?: object}} options
 *   windows: the app's windows (BrowserWindow-like: id, isDestroyed, isVisible, isMinimized, getBounds, setIgnoreMouseEvents)
 */
function createClickThrough({ windows, getCursor = null, alwaysThrough = () => false, restorer = () => undefined, now = defaultNow,
  sleep = defaultSleep, setTimer = setTimeout, clearTimer = clearTimeout, log = console } = {}) {
  let burst;              // official MG: {held: window[], heldIds: Set}
  let burstTimer;         // official fPr
  const running = new Set();   // official hPr: the actions in flight

  const live = () => { try { return (windows() ?? []).filter((w) => w && !w.isDestroyed()); } catch { return []; } };
  const isAlwaysThrough = (w) => { try { return alwaysThrough(w) === true; } catch { return false; } };
  const restorerOf = (w) => { try { return restorer(w); } catch { return undefined; } };
  const hiddenOrMinimized = (w) => { try { return !w.isVisible() || w.isMinimized(); } catch { return true; } };
  // Official CPr: visible, not minimized, and some point within 16 px of its bounds.
  const near = (w, points) => {
    if (isAlwaysThrough(w) || hiddenOrMinimized(w)) return false;
    let b;
    try { b = w.getBounds(); } catch { return false; }
    return points.some((p) => p.x >= b.x - NEAR_PX && p.x < b.x + b.width + NEAR_PX && p.y >= b.y - NEAR_PX && p.y < b.y + b.height + NEAR_PX);
  };
  const setThrough = (w, on) => { try { w.setIgnoreMouseEvents(on); } catch (error) { log.warn?.("[computer-use] click-through toggle failed", error); } };
  // Official gPr: a window an unfinished (not presumed hung) action holds.
  const heldByRunning = (id) => { const t = now(); for (const a of running) if (t < a.presumedHungAt && a.windows.has(id)) return true; return false; };
  // Official TPr: hand the mouse back.
  function handBack(list) {
    for (const w of list) {
      try { if (w.isDestroyed()) continue; } catch { continue; }
      if (heldByRunning(w.id)) continue;
      if (isAlwaysThrough(w)) continue;
      const restore = restorerOf(w);
      if (typeof restore === "function") { try { restore(); } catch (error) { log.warn?.("[computer-use] click-through restore failed", error); } continue; }
      setThrough(w, false);
    }
  }
  // Official _Pr / vPr.
  function endBurst(b) {
    if (b === undefined || burst !== b) return;
    burst = undefined;
    clearTimer(burstTimer);
    burstTimer = undefined;
    handBack(b.held);
  }
  function armBurst(ms) {
    clearTimer(burstTimer);
    const b = burst;
    burstTimer = b === undefined ? undefined : setTimer(() => endBurst(b), ms);
  }

  /** Official yPr: a new burst (any earlier one ends first); returns its end. */
  function beginInputBurst() {
    endBurst(burst);
    const b = { held: [], heldIds: new Set() };
    burst = b;
    armBurst(IDLE_MS);
    return () => endBurst(b);
  }

  /** Official NG: run one pointer delivery with the app's windows near `points` (and the cursor) letting the mouse through. */
  async function around(points, run) {
    const b = burst;
    if (b !== undefined) armBurst(RUNNING_MS);
    const action = { windows: new Map(), since: new Map(), presumedHungAt: 0 };
    let hungTimer;
    const notHeldByBurst = () => [...action.windows].filter(([id]) => burst?.heldIds.has(id) !== true).map(([, w]) => w);
    const alive = () => {
      running.add(action);
      action.presumedHungAt = now() + RUNNING_MS;
      clearTimer(hungTimer);
      hungTimer = setTimer(() => { running.delete(action); handBack(notHeldByBurst()); }, RUNNING_MS);
    };
    alive();
    const settle = async () => {
      if (now() >= action.presumedHungAt) { action.since.clear(); alive(); }
      const at = (Array.isArray(points) ? points : []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
      if (typeof getCursor === "function") {
        try { const c = await getCursor(); if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) at.push(c); } catch {}
      }
      const all = live();
      const close = at.length ? all.filter((w) => near(w, at)) : all.filter((w) => !isAlwaysThrough(w));
      const heldIds = b !== undefined && burst === b ? b.heldIds : undefined;
      // Something of ours near the action: all of the app's windows let it through; else only hidden ones (they may show).
      const toggle = close.length ? all : all.filter((w) => hiddenOrMinimized(w) && !isAlwaysThrough(w));
      const t0 = now();
      for (const w of toggle) {
        if (action.since.has(w.id)) continue;
        action.windows.set(w.id, w);
        action.since.set(w.id, heldIds?.has(w.id) ? -Infinity : t0);
        setThrough(w, true);
      }
      if (!close.length) return;
      const ready = Math.max(...close.map((w) => (action.since.get(w.id) ?? t0) + SETTLE_MS));
      if (ready > t0) await sleep(ready - t0);
    };
    try {
      await settle();
      return await run();
    } finally {
      running.delete(action);
      clearTimer(hungTimer);
      const same = b !== undefined && burst === b;
      if (same) {
        // Kept through until the burst ends — except windows with a restorer of their own (the teach overlay), handed
        // back after every action as officially.
        const now_ = [];
        for (const [id, w] of action.windows) {
          if (restorerOf(w) === undefined) { if (!b.heldIds.has(id)) { b.heldIds.add(id); b.held.push(w); } }
          else now_.push(w);
        }
        handBack(now_);
        armBurst(IDLE_MS);
      } else handBack(notHeldByBurst());
    }
  }

  return {
    around,
    beginInputBurst,
    /** Whether a burst is open (tests, logs). */
    inBurst: () => burst !== undefined,
    /** Hand everything back now (app quitting, the lock going away). */
    endAll() { endBurst(burst); },
  };
}

/** The pointer actions that make up an input burst (official Ui: Bi's keys plus mouse_move). */
const BURST_ACTIONS = Object.freeze(new Set(["left_click", "right_click", "middle_click", "double_click", "triple_click", "scroll",
  "left_click_drag", "left_mouse_down", "left_mouse_up", "mouse_move"]));

/**
 * Official Gi(): run a batch body with `beforeAction(action)`: a pointer action opens a burst (or keeps the open one),
 * anything else closes it; it is always closed at the end.
 * @param {() => Function} begin  starts a burst and returns its end
 */
async function withInputBurst(begin, body) {
  let end;
  const close = () => { const e = end; end = undefined; try { e?.(); } catch {} };
  try {
    return await body({
      beforeAction(action) {
        if (BURST_ACTIONS.has(action)) { if (!end) { try { end = begin() ?? NOOP; } catch { end = NOOP; } } }
        else close();
      },
    });
  } finally { close(); }
}

module.exports = { createClickThrough, withInputBurst, BURST_ACTIONS, SETTLE_MS, IDLE_MS, RUNNING_MS, NEAR_PX };
