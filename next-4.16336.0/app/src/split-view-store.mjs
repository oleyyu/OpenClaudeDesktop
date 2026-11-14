// One split-view store per renderer (window): the split-view-model.mjs grid state (the reference's pane store,
// shared-16 Q), each pane's App as handlers (navigate / focus / settings), and the window layout reported to
// main.cjs ("window-layout", "split-menu-state") so menus, routing and relaunch follow it. No React here
// (source-split-view.jsx subscribes with useSyncExternalStore), so it is unit-testable.
//
// Panes are addressed by index (0 the primary, i > 0 state.panes[i - 1]) like the reference's paneIndex, but an
// App registers under its pane's stable key: closing or moving a pane shifts the indexes, never the Apps.
import * as model from "./split-view-model.mjs";

const PRIMARY = "primary";

// Browser timers require their Window receiver; preserve it for the default
// clock while allowing injected clocks to retain their own receiver.
// allowSplit false: a session popout (B27; c2189a16b "popout_has_no_panes"): the window shows its one session, so
// opening, restoring, moving or dropping panes and the View › Split View commands change nothing there.
export function createSplitViewStore({ report = () => {}, timers = globalThis, delay = 250, allowSplit = true } = {}) {
  let state = model.emptySplit, slotVersion = 0, view = { ...state, slotVersion }, timer = null;
  let reported = { layout: null, menu: null };
  const listeners = new Set();
  const slots = new Map(); // pane key → the element its App portals into
  const handlers = new Map(); // pane key (or "primary") → { navigate, focus, settings?, windowKey? }
  // Effects for a pane whose App has not registered yet (a new pane mounts after it opens).
  const pending = new Map();

  const keyAt = (index, from = state) => (index === 0 ? PRIMARY : from.panes[index - 1]?.key ?? null);
  const notify = () => { view = { ...state, slotVersion }; for (const listener of [...listeners]) listener(); };
  function sendReport() {
    timer = null;
    const layout = model.splitLayout(state), menu = model.splitMenuState(state);
    const layoutKey = JSON.stringify(layout), menuKey = JSON.stringify(menu);
    if (layoutKey === reported.layout && menuKey === reported.menu) return;
    const changed = { layout: layoutKey !== reported.layout ? layout : null, menu: menuKey !== reported.menu ? menu : null };
    reported = { layout: layoutKey, menu: menuKey };
    try { report(changed); } catch {}
  }
  function scheduleReport() {
    timers.clearTimeout(timer);
    timer = timers.setTimeout(sendReport, delay);
  }
  // What main.cjs routes by (windowsShowing: unread marks, notifications' window, a session another window shows):
  // a change of the sessions shown is reported at once; weights, the row split and focus wait for the debounce.
  const shownKey = (value) => { const layout = model.splitLayout(value); return [layout.current ?? "", ...(layout.split?.panes ?? []).map((pane) => pane.sessionId)].join("|"); };
  function set(next) {
    if (next === state) return;
    const shownChanged = shownKey(next) !== shownKey(state);
    state = next;
    notify();
    if (shownChanged) { timers.clearTimeout(timer); sendReport(); } else scheduleReport();
  }
  function queue(key, effect) {
    if (key === null) return;
    if (!pending.has(key)) pending.set(key, []);
    pending.get(key).push(effect);
  }
  function apply(effect) {
    if (effect.navigate) {
      const [index, id] = effect.navigate, key = keyAt(index);
      if (handlers.get(key)?.navigate) handlers.get(key).navigate(id); else queue(key, effect);
    }
    if (Number.isInteger(effect.focus)) {
      const key = keyAt(effect.focus);
      if (handlers.get(key)?.focus) handlers.get(key).focus(); else queue(key, effect);
    }
  }
  function run(result) {
    set(result.state);
    // Queued effects for panes that no longer exist are dropped.
    const live = new Set([PRIMARY, ...state.panes.map((pane) => pane.key)]);
    for (const key of [...pending.keys()]) if (!live.has(key)) pending.delete(key);
    for (const effect of result.effects) apply(effect);
    return result;
  }
  const changed = (result, before) => result.state !== before || result.effects.length > 0;
  const unchanged = () => ({ state, effects: [] });
  // In a window without split view only the primary pane exists: every pane-opening step is a no-op.
  const panes = (step) => (allowSplit ? step() : unchanged());
  return {
    getState: () => view,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    /** A pane's App: { navigate(id), focus(), settings?(value) }, registered under the pane at `side` now. */
    register(side, handler) {
      const key = keyAt(side);
      if (key === null) return () => {};
      handlers.set(key, handler);
      const queued = pending.get(key) ?? [];
      pending.delete(key);
      for (const effect of queued) {
        if (effect.navigate) handler.navigate?.(effect.navigate[1]);
        if (Number.isInteger(effect.focus)) handler.focus?.();
      }
      return () => { if (handlers.get(key) === handler) handlers.delete(key); };
    },
    reportSide(side, value) { set(model.reportSide(state, side, value)); },
    open(id = null, options) { return run(panes(() => model.openSplit(state, id, options))).state; },
    /** insertLeftOfPrimary; false when the session cannot open there. */
    openLeft(id) { const before = state; return changed(run(panes(() => model.openLeftOfPrimary(state, id))), before); },
    close(side = state.active) { return run(model.closeSide(state, side)).state; },
    focus(side, options) { return run(model.focusSide(state, side, options)).state; },
    focusNext(step = 1) { return run(model.focusNext(state, step)).state; },
    move(side, target) { return run(model.movePane(state, side, target)).state; },
    dropPane(side, drop) { return run(panes(() => model.dropPane(state, side, drop))).state; },
    openInFocusedSide(id) { return run(model.openInFocusedSide(state, id)).state; },
    /** A View › Split View command or its chord; false when it changes nothing (the chord is then left alone). */
    command(name) { const before = state; return changed(run(panes(() => model.splitCommand(state, name))), before); },
    restore(split, options) { return run(panes(() => model.restoreSplit(state, split, options))).state; },
    /** Whether this window can split (false in a session popout). */
    splitAllowed: () => allowSplit,
    setColWeights(weights) { set(model.setColWeights(state, weights)); },
    setRowSplit(value) { set(model.setRowSplit(state, value)); },
    setMaxColumns(value) { set(model.setMaxColumns(state, value)); },
    setConstrained(value) { return run(model.setConstrained(state, value)).state; },
    /** An extra pane's DOM host (SourceSplitHost) its App portals into. */
    setSlot(key, element) {
      const current = slots.get(key) ?? null, next = element ?? null;
      if (current === next) return;
      if (next) slots.set(key, next); else slots.delete(key);
      slotVersion += 1;
      notify();
    },
    slotFor: (key) => slots.get(key) ?? null,
    isShown(id) { return model.sideShowing(state, id) !== null; },
    sideShowing(id) { return model.sideShowing(state, id); },
    /** Window-wide surfaces (Settings) belong to the primary pane's App. */
    toPrimary(kind, value) { const run = handlers.get(PRIMARY)?.[kind]; if (typeof run === "function") { run(value); return true; } return false; },
    layout: () => model.splitLayout(state),
    /** Report the whole state once (a window's renderer just loaded: main keeps nothing from its previous page). */
    reportNow() { timers.clearTimeout(timer); reported = { layout: null, menu: null }; sendReport(); },
    /** Report now (the window is closing or reloading). */
    flushReport() { if (timer === null) return; timers.clearTimeout(timer); sendReport(); },
  };
}
